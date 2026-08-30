import { IndexingStatus } from '@prisma/client';
import { BinaryFileError, FileTooLargeError } from '../file-processing';
import { GitHubRateLimitError } from '../github/github.errors';
import { JobHandlerError } from '../queue/queue.errors';
import { IndexingPayload, IndexingPipelineDependencies, IndexingPipelineResult } from './indexing.types';

/** Executes one repository indexing operation; queue coordination remains in IndexingJobWorker. */
export class IndexingPipeline {
  constructor(private readonly dependencies: IndexingPipelineDependencies) {}

  async execute(payload: IndexingPayload): Promise<IndexingPipelineResult> {
    let repositoryId: string | undefined;
    try {
      const job = await this.dependencies.getJob(payload.jobId);
      if (job.repositoryId !== payload.repositoryId) {
        throw new Error('Queue payload repository does not match the indexing job');
      }
      repositoryId = job.repositoryId;
      const repository = await this.dependencies.getRepository(repositoryId);
      const indexedRepositoryId = repositoryId;
      if (!repository.githubOwner || !repository.githubRepo) {
        throw new Error('Repository is missing GitHub owner or repository name');
      }

      await this.dependencies.updateRepositoryStatus(repositoryId, IndexingStatus.INDEXING);
      await this.progress(job.id, 5, 'FETCHING_REPOSITORY', {});

      const metadata = await this.dependencies.getMetadata(repository.githubOwner, repository.githubRepo);
      await this.dependencies.updateRepositoryMetadata(repositoryId, {
        description: metadata.description,
        defaultBranch: metadata.defaultBranch,
        stars: metadata.stars,
        forks: metadata.forks,
        primaryLanguage: metadata.primaryLanguage,
        githubCreatedAt: metadata.createdAt,
        githubUpdatedAt: metadata.updatedAt,
      });

      await this.progress(job.id, 12, 'DISCOVERING_FILES', {});
      const tree = await this.dependencies.getTree(repository.githubOwner, repository.githubRepo, metadata.defaultBranch);
      const processable = tree.filter((item) => item.type === 'file' && this.dependencies.shouldProcess(item).status === 'PROCESSABLE');
      const counters = { filesDiscovered: processable.length, filesProcessed: 0, chunksCreated: 0, embeddingsGenerated: 0 };
      await this.progress(job.id, 20, 'PROCESSING_FILES', counters);

      const priorFiles = await this.dependencies.getRepositoryFiles(repositoryId);
      const currentPaths = new Set<string>();

      for (const item of processable) {
        const fileContent = await this.dependencies.getFileContent(repository.githubOwner, repository.githubRepo, item.path, metadata.defaultBranch);
        let file;
        try {
          file = this.dependencies.normalizeFile(item, fileContent);
        } catch (error) {
          if (error instanceof BinaryFileError || error instanceof FileTooLargeError) continue;
          throw new Error(`Failed to normalize ${item.path}: ${this.message(error)}`);
        }

        // Empty files are persisted as known files but never create chunks or vectors.
        if (file.content.trim().length === 0) {
          const emptyRecord = await this.dependencies.upsertRepositoryFile({
            repositoryId, filePath: file.path, fileName: file.fileName, extension: file.extension,
            language: file.language, fileSize: file.size, sha: file.sha, chunkCount: 0,
          });
          await this.dependencies.deleteFileVectors(emptyRecord.id);
          currentPaths.add(item.path);
          counters.filesProcessed++;
          await this.progressForFile(job.id, counters);
          continue;
        }

        const chunks = this.dependencies.chunkFile(file);
        const record = await this.dependencies.upsertRepositoryFile({
          repositoryId, filePath: file.path, fileName: file.fileName, extension: file.extension,
          language: file.language, fileSize: file.size, sha: file.sha, chunkCount: chunks.length,
        });
        counters.chunksCreated += chunks.length;
        await this.progress(job.id, this.fileProgress(counters), 'GENERATING_EMBEDDINGS', counters);

        const embeddings = await this.dependencies.embedBatch(chunks.map((chunk) => chunk.content));
        if (embeddings.length !== chunks.length) throw new Error(`Embedding count mismatch for ${file.path}`);
        counters.embeddingsGenerated += embeddings.length;
        await this.progress(job.id, this.fileProgress(counters), 'STORING_VECTORS', counters);
        await this.dependencies.upsertVectors(chunks.map((chunk, index) => ({
          repositoryId: indexedRepositoryId,
          repositoryFileId: record.id,
          repositoryOwner: repository.githubOwner,
          repositoryName: repository.githubRepo,
          chunk,
          embedding: embeddings[index],
        })));
        // New vectors are written before old-sha vectors are removed, avoiding a zero-vector file on failed writes.
        await this.dependencies.deleteFileVectorsExceptSha(record.id, file.sha);
        currentPaths.add(item.path);
        counters.filesProcessed++;
        await this.progressForFile(job.id, counters);
      }

      await this.progress(job.id, 92, 'RECONCILING_STALE_FILES', counters);
      for (const staleFile of priorFiles) {
        if (!currentPaths.has(staleFile.filePath)) {
          await this.dependencies.deleteFileVectors(staleFile.id);
          await this.dependencies.deleteRepositoryFile(staleFile.id);
        }
      }
      await this.dependencies.updateRepositorySummary(repositoryId, {
        fileCount: counters.filesDiscovered,
        indexedFileCount: counters.filesProcessed,
        chunkCount: counters.chunksCreated,
      });
      await this.progress(job.id, 98, 'FINALIZING', counters);
      await this.dependencies.updateRepositoryStatus(repositoryId, IndexingStatus.COMPLETED);
      return { jobId: job.id, repositoryId, ...counters };
    } catch (error) {
      if (repositoryId) {
        try { await this.dependencies.updateRepositoryStatus(repositoryId, IndexingStatus.FAILED, this.message(error)); }
        catch { /* Preserve the original pipeline failure for worker retry handling. */ }
      }
      throw new JobHandlerError(this.message(error), this.isRetryable(error), error);
    }
  }

  private async progress(jobId: string, progress: number, currentStep: string, counters: Partial<IndexingPipelineResult>): Promise<void> {
    await this.dependencies.updateProgress(jobId, { progress, currentStep, ...counters });
  }

  private async progressForFile(jobId: string, counters: Pick<IndexingPipelineResult, 'filesDiscovered' | 'filesProcessed' | 'chunksCreated' | 'embeddingsGenerated'>): Promise<void> {
    await this.progress(jobId, this.fileProgress(counters), 'PROCESSING_FILES', counters);
  }

  private fileProgress(counters: Pick<IndexingPipelineResult, 'filesDiscovered' | 'filesProcessed'>): number {
    if (counters.filesDiscovered === 0) return 90;
    return Math.min(90, 20 + Math.floor((counters.filesProcessed / counters.filesDiscovered) * 70));
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof JobHandlerError) return error.retryable;
    if (error instanceof GitHubRateLimitError) return true;
    return !(error instanceof Error && /missing|mismatch|match|normalize|empty|invalid|not found|truncated/i.test(error.message));
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : 'Repository indexing failed';
  }
}
