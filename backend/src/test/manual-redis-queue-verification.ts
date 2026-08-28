import { config } from '../config';
import { IndexingJobQueue, RedisClient } from '../queue';

async function main(): Promise<void> {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const name = `test-${suffix}`;
  const redis = new RedisClient(config.redis.url);
  const queue = new IndexingJobQueue(redis, name);
  const payload = { jobId: `job-${suffix}`, repositoryId: `repository-${suffix}` };
  try {
    console.log(`Redis ping: ${await redis.ping()}`);
    console.log(`Enqueued: ${await queue.enqueue(payload)}`);
    const first = await queue.dequeue();
    if (!first) throw new Error('Expected queued job');
    await queue.acknowledge(first);
    console.log('Acknowledgement: OK');
    await queue.enqueue(payload);
    const failed = await queue.dequeue();
    if (!failed) throw new Error('Expected retry job');
    const retry = await queue.retry(failed, 1);
    if (!retry) throw new Error('Expected retry to be scheduled');
    const retried = await queue.dequeue();
    if (!retried) throw new Error('Expected retried job');
    await queue.acknowledge(retried);
    console.log('Retry: OK');
  } finally {
    await redis.disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
