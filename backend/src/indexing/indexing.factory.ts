import { ChunkingService } from '../chunking';
import { EmbeddingService, OllamaEmbeddingProvider } from '../embeddings';
import { FileFilterService, FileNormalizerService } from '../file-processing';
import { githubService } from '../github';
import { IndexingJobWorker, IndexingJobQueue, RedisClient } from '../queue';
import { repositoryFileService, repositoryService, indexingJobService } from '../services';
import { config } from '../config';
import { QdrantVectorService } from '../vector-store';
import { IndexingPipeline } from './indexing.pipeline';

/** Creates the real Milestone 6B handler and attaches it to the existing 6A worker. */
export function createIndexingWorker(redisClient?: RedisClient): IndexingJobWorker {
  const redis = redisClient ?? new RedisClient(config.redis.url);
  const filter = new FileFilterService();
  const normalizer = new FileNormalizerService(filter);
  const chunker = new ChunkingService();
  const embeddings = new EmbeddingService(new OllamaEmbeddingProvider());
  const vectors = new QdrantVectorService({
    qdrantUrl: config.qdrant.url,
    collectionName: config.qdrant.collectionName,
    upsertBatchSize: config.qdrant.upsertBatchSize,
    timeoutMs: config.qdrant.timeoutMs,
  });
  const pipeline = new IndexingPipeline({
    getJob: (id) => indexingJobService.getIndexingJobById(id),
    getRepository: (id) => repositoryService.getRepositoryById(id),
    updateRepositoryStatus: (id, status, error) => repositoryService.updateIndexingStatus(id, status, error),
    updateRepositoryMetadata: (id, data) => repositoryService.updateGitHubMetadata(id, data),
    updateRepositorySummary: (id, data) => repositoryService.updateRepository(id, data),
    updateProgress: (id, value) => indexingJobService.updateProgress(id, value),
    getMetadata: (owner, repo) => githubService.getRepositoryMetadata(owner, repo),
    getTree: (owner, repo, ref) => githubService.getRepositoryTree(owner, repo, ref),
    getFileContent: (owner, repo, path, ref) => githubService.getFileContent(owner, repo, path, ref),
    shouldProcess: (item) => filter.shouldProcess(item),
    normalizeFile: (item, content) => normalizer.normalizeFile(item, content),
    chunkFile: (file) => chunker.chunkFile(file),
    embedBatch: (texts) => embeddings.embedBatch(texts),
    upsertVectors: (inputs) => vectors.upsertVectors(inputs),
    deleteFileVectors: (id) => vectors.deleteFileVectors(id),
    deleteFileVectorsExceptSha: (id, sha) => vectors.deleteFileVectorsExceptSha(id, sha),
    getRepositoryFiles: (id) => repositoryFileService.getFilesByRepository(id),
    upsertRepositoryFile: (data) => repositoryFileService.upsertRepositoryFile(data),
    deleteRepositoryFile: (id) => repositoryFileService.deleteRepositoryFile(id),
  });
  return new IndexingJobWorker(
    new IndexingJobQueue(redis, config.redis.jobQueueName),
    indexingJobService,
    (payload) => pipeline.execute(payload).then(() => undefined),
    config.redis.jobMaxRetries,
    config.redis.jobRetryDelayMs,
  );
}
