import { config } from '../config';
import { prisma } from '../config/database';
import { createIndexingWorker } from '../indexing';
import { IndexingJobQueue, RedisClient } from '../queue';
import { indexingJobService, repositoryService, userService } from '../services';
import { QdrantVectorService } from '../vector-store';

async function main(): Promise<void> {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const vectors = new QdrantVectorService({
    qdrantUrl: config.qdrant.url,
    collectionName: config.qdrant.collectionName,
    upsertBatchSize: config.qdrant.upsertBatchSize,
    timeoutMs: config.qdrant.timeoutMs,
  });
  const redis = new RedisClient(config.redis.url);
  let userId: string | undefined;
  let repositoryId: string | undefined;
  try {
    console.log(`Redis ping: ${await redis.ping()}`);
    const user = await userService.createUser(`indexing-${suffix}@example.com`);
    userId = user.id;
    const repository = await repositoryService.createRepository({
      userId, githubOwner: 'octocat', githubRepo: 'Hello-World', githubUrl: 'https://github.com/octocat/Hello-World',
    });
    repositoryId = repository.id;
    const job = await indexingJobService.createIndexingJob(repositoryId);
    const queue = new IndexingJobQueue(redis, config.redis.jobQueueName);
    if (!await queue.enqueue({ jobId: job.id, repositoryId })) throw new Error('Manual indexing job was not enqueued');
    const result = await createIndexingWorker().processNext();
    if (!result?.completed) throw new Error('Manual indexing worker did not complete the job');
    const completedJob = await indexingJobService.getIndexingJobById(job.id);
    const completedRepository = await repositoryService.getRepositoryById(repositoryId);
    const collection = await vectors.getCollectionConfig();
    if (completedJob.status !== 'COMPLETED' || completedRepository.indexingStatus !== 'COMPLETED') throw new Error('Job or repository did not complete');
    console.log(`Completed: files=${completedJob.filesProcessed}, chunks=${completedJob.chunksCreated}, embeddings=${completedJob.embeddingsGenerated}, collectionPoints=${collection.vectorsCount}`);
  } finally {
    if (repositoryId) await vectors.deleteRepositoryVectors(repositoryId).catch(() => undefined);
    if (userId) await userService.deleteUser(userId).catch(() => undefined);
    await redis.disconnect();
    await prisma.$disconnect();
    console.log('Cleanup complete');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
