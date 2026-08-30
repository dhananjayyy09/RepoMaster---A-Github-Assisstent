import { IndexingStatus } from '@prisma/client';
import { IndexingPipeline, IndexingPipelineDependencies } from '../indexing';
import { GitHubTreeTruncatedError } from '../github/github.errors';
import { JobHandlerError } from '../queue';

const repository = {
  id: 'repository-1', userId: 'user-1', githubOwner: 'owner', githubRepo: 'repo', githubUrl: 'https://github.com/owner/repo',
  description: null, defaultBranch: 'main', stars: 0, forks: 0, primaryLanguage: null, fileCount: 0, indexedFileCount: 0,
  chunkCount: 0, indexingStatus: IndexingStatus.PENDING, indexingError: null, githubCreatedAt: null, githubUpdatedAt: null,
  indexedAt: null, createdAt: new Date(), updatedAt: new Date(),
};
const treeFile = { path: 'src/app.ts', type: 'file' as const, sha: 'tree-sha', size: 20 };
const processed = { path: 'src/app.ts', fileName: 'app.ts', extension: '.ts', language: 'TypeScript' as const, content: 'export const app = 1;', size: 21, sha: 'file-sha', isProcessable: true };
const chunk = { id: 'chunk-1', content: processed.content, filePath: processed.path, fileName: processed.fileName, language: processed.language, startLine: 1, endLine: 1, chunkIndex: 0, totalChunks: 1, fileSha: processed.sha, size: 21, chunkType: 'CODE' as const };
const embedding = { vector: [0.1, 0.2], dimensions: 2, model: 'test', inputLength: 21 };

function dependencies(): jest.Mocked<IndexingPipelineDependencies> {
  return {
    getJob: jest.fn().mockResolvedValue({ id: 'job-1', repositoryId: 'repository-1' }),
    getRepository: jest.fn().mockResolvedValue(repository),
    updateRepositoryStatus: jest.fn().mockResolvedValue(repository), updateRepositoryMetadata: jest.fn().mockResolvedValue(repository), updateRepositorySummary: jest.fn().mockResolvedValue(repository),
    updateProgress: jest.fn().mockResolvedValue(undefined),
    getMetadata: jest.fn().mockResolvedValue({ owner: 'owner', name: 'repo', fullName: 'owner/repo', url: 'https://github.com/owner/repo', description: 'description', defaultBranch: 'main', stars: 1, forks: 2, primaryLanguage: 'TypeScript', size: 1, createdAt: new Date(), updatedAt: new Date(), pushedAt: new Date(), visibility: 'public', isArchived: false }),
    getTree: jest.fn().mockResolvedValue([treeFile, { path: 'node_modules/a.js', type: 'file', sha: 'skip', size: 1 }]),
    getFileContent: jest.fn().mockResolvedValue({ path: processed.path, content: processed.content, sha: processed.sha, size: processed.size, encoding: 'base64' }),
    shouldProcess: jest.fn((item) => item.path.startsWith('node_modules') ? { status: 'UNSUPPORTED' } : { status: 'PROCESSABLE' }),
    normalizeFile: jest.fn().mockReturnValue(processed), chunkFile: jest.fn().mockReturnValue([chunk]), embedBatch: jest.fn().mockResolvedValue([embedding]),
    upsertVectors: jest.fn().mockResolvedValue({ upsertedCount: 1 }), deleteFileVectors: jest.fn().mockResolvedValue({}), deleteFileVectorsExceptSha: jest.fn().mockResolvedValue({}),
    getRepositoryFiles: jest.fn().mockResolvedValue([{ id: 'stale-file', repositoryId: 'repository-1', filePath: 'removed.ts' }]),
    upsertRepositoryFile: jest.fn().mockResolvedValue({ id: 'file-1' }), deleteRepositoryFile: jest.fn().mockResolvedValue({ id: 'stale-file' }),
  } as unknown as jest.Mocked<IndexingPipelineDependencies>;
}

describe('IndexingPipeline', () => {
  it('processes files in GitHub-to-Qdrant order and reconciles stale records', async () => {
    const deps = dependencies(); const pipeline = new IndexingPipeline(deps);
    const result = await pipeline.execute({ jobId: 'job-1', repositoryId: 'repository-1' });
    expect(result).toMatchObject({ filesDiscovered: 1, filesProcessed: 1, chunksCreated: 1, embeddingsGenerated: 1 });
    expect(deps.getFileContent).toHaveBeenCalledWith('owner', 'repo', 'src/app.ts', 'main');
    expect(deps.embedBatch).toHaveBeenCalledWith([chunk.content]);
    expect(deps.upsertVectors).toHaveBeenCalledWith([expect.objectContaining({ chunk, embedding, repositoryFileId: 'file-1' })]);
    expect(deps.deleteFileVectorsExceptSha).toHaveBeenCalledWith('file-1', 'file-sha');
    expect(deps.deleteFileVectors).toHaveBeenCalledWith('stale-file');
    expect(deps.deleteRepositoryFile).toHaveBeenCalledWith('stale-file');
    expect(deps.updateRepositoryStatus).toHaveBeenLastCalledWith('repository-1', IndexingStatus.COMPLETED);
  });

  it('keeps counters consistent and records real progress steps', async () => {
    const deps = dependencies(); await new IndexingPipeline(deps).execute({ jobId: 'job-1', repositoryId: 'repository-1' });
    const values = deps.updateProgress.mock.calls.map(([, value]) => value);
    expect(values.some((value) => value.currentStep === 'DISCOVERING_FILES')).toBe(true);
    expect(values.some((value) => value.currentStep === 'GENERATING_EMBEDDINGS')).toBe(true);
    expect(values.some((value) => value.currentStep === 'STORING_VECTORS')).toBe(true);
    const final = values[values.length - 1];
    expect(final.filesDiscovered!).toBeGreaterThanOrEqual(final.filesProcessed!);
    expect(final.embeddingsGenerated!).toBeLessThanOrEqual(final.chunksCreated!);
  });

  it('does not download ignored files', async () => {
    const deps = dependencies(); deps.getTree.mockResolvedValue([{ path: 'node_modules/a.js', type: 'file', sha: 'skip', size: 1 }]);
    await new IndexingPipeline(deps).execute({ jobId: 'job-1', repositoryId: 'repository-1' });
    expect(deps.getFileContent).not.toHaveBeenCalled();
  });

  it('fails truncated trees explicitly and synchronizes repository failure', async () => {
    const deps = dependencies(); deps.getTree.mockRejectedValue(new GitHubTreeTruncatedError());
    await expect(new IndexingPipeline(deps).execute({ jobId: 'job-1', repositoryId: 'repository-1' })).rejects.toEqual(expect.objectContaining({ retryable: false } as Partial<JobHandlerError>));
    expect(deps.updateRepositoryStatus).toHaveBeenLastCalledWith('repository-1', IndexingStatus.FAILED, expect.stringContaining('truncated'));
    expect(deps.embedBatch).not.toHaveBeenCalled();
  });

  it('rejects queue payloads that do not match the persisted job', async () => {
    const deps = dependencies(); deps.getJob.mockResolvedValue({ id: 'job-1', repositoryId: 'other-repository' });
    await expect(new IndexingPipeline(deps).execute({ jobId: 'job-1', repositoryId: 'repository-1' })).rejects.toMatchObject({ retryable: false });
    expect(deps.getRepository).not.toHaveBeenCalled();
  });
});
