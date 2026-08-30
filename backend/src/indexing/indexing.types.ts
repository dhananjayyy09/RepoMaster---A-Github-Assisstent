import { Repository, RepositoryFile } from '@prisma/client';
import { CodeChunk } from '../chunking';
import { EmbeddingResult } from '../embeddings';
import { FileContent, RepositoryMetadata, TreeItem } from '../github';
import { ProcessedFile } from '../file-processing';
import { IndexingJobPayload } from '../queue/queue.types';

export interface IndexingPipelineResult {
  jobId: string;
  repositoryId: string;
  filesDiscovered: number;
  filesProcessed: number;
  chunksCreated: number;
  embeddingsGenerated: number;
}

export interface IndexingPipelineDependencies {
  getJob(id: string): Promise<{ id: string; repositoryId: string }>;
  getRepository(id: string): Promise<Repository>;
  updateRepositoryStatus(id: string, status: 'PENDING' | 'INDEXING' | 'COMPLETED' | 'FAILED', error?: string): Promise<Repository>;
  updateRepositoryMetadata(id: string, data: { description?: string | null; defaultBranch: string; stars: number; forks: number; primaryLanguage?: string | null; githubCreatedAt: Date; githubUpdatedAt: Date }): Promise<Repository>;
  updateRepositorySummary(id: string, data: { fileCount: number; indexedFileCount: number; chunkCount: number }): Promise<Repository>;
  updateProgress(id: string, progress: { progress: number; currentStep?: string; filesDiscovered?: number; filesProcessed?: number; chunksCreated?: number; embeddingsGenerated?: number }): Promise<unknown>;
  getMetadata(owner: string, repo: string): Promise<RepositoryMetadata>;
  getTree(owner: string, repo: string, ref?: string): Promise<TreeItem[]>;
  getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<FileContent>;
  shouldProcess(item: TreeItem): { status: string; reason?: string };
  normalizeFile(item: TreeItem, content: FileContent): ProcessedFile;
  chunkFile(file: ProcessedFile): CodeChunk[];
  embedBatch(texts: string[]): Promise<EmbeddingResult[]>;
  upsertVectors(inputs: Array<{ repositoryId: string; repositoryFileId: string; repositoryOwner: string; repositoryName: string; chunk: CodeChunk; embedding: EmbeddingResult }>): Promise<unknown>;
  deleteFileVectors(fileId: string): Promise<unknown>;
  deleteFileVectorsExceptSha(fileId: string, sha: string): Promise<unknown>;
  getRepositoryFiles(repositoryId: string): Promise<RepositoryFile[]>;
  upsertRepositoryFile(data: { repositoryId: string; filePath: string; fileName: string; extension?: string; language?: string; fileSize: number; sha: string; chunkCount: number }): Promise<RepositoryFile>;
  deleteRepositoryFile(id: string): Promise<RepositoryFile>;
}

export type IndexingPayload = IndexingJobPayload;
