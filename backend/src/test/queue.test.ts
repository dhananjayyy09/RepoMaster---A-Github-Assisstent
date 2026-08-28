import { JobStatus } from '@prisma/client';
import { IndexingJobService } from '../services/indexingJob.service';
import { indexingJobRepository } from '../repositories';
import {
  IndexingJobQueue,
  IndexingJobWorker,
  JobHandlerError,
  QueuePayloadError,
  RedisCommandClient,
  RedisClient,
  RedisConnectionError,
} from '../queue';
import { parseEnvironment } from '../config';

class MemoryRedis implements RedisCommandClient {
  lists = new Map<string, string[]>(); sets = new Map<string, Set<string>>(); hashes = new Map<string, Map<string, string>>();
  async connect(): Promise<void> {} async disconnect(): Promise<void> {} isOpen(): boolean { return true; } async ping(): Promise<string> { return 'PONG'; }
  async rPush(key: string, value: string): Promise<number> { const list = this.lists.get(key) ?? []; list.push(value); this.lists.set(key, list); return list.length; }
  async lMove(source: string, destination: string, from: 'LEFT' | 'RIGHT', to: 'LEFT' | 'RIGHT'): Promise<string | null> { const sourceList = this.lists.get(source) ?? []; const value = from === 'LEFT' ? sourceList.shift() : sourceList.pop(); if (!value) return null; const destinationList = this.lists.get(destination) ?? []; to === 'LEFT' ? destinationList.unshift(value) : destinationList.push(value); this.lists.set(destination, destinationList); return value; }
  async lRem(key: string, count: number, value: string): Promise<number> { const list = this.lists.get(key) ?? []; const index = list.indexOf(value); if (index < 0) return 0; list.splice(index, count === 0 ? list.length : 1); return 1; }
  async sAdd(key: string, value: string): Promise<number> { const set = this.sets.get(key) ?? new Set<string>(); const had = set.has(value); set.add(value); this.sets.set(key, set); return had ? 0 : 1; }
  async sRem(key: string, value: string): Promise<number> { return (this.sets.get(key)?.delete(value) ?? false) ? 1 : 0; }
  async hGet(key: string, field: string): Promise<string | undefined> { return this.hashes.get(key)?.get(field); }
  async hSet(key: string, field: string, value: string): Promise<number> { const hash = this.hashes.get(key) ?? new Map<string, string>(); const had = hash.has(field); hash.set(field, value); this.hashes.set(key, hash); return had ? 0 : 1; }
  async hDel(key: string, field: string): Promise<number> { return (this.hashes.get(key)?.delete(field) ?? false) ? 1 : 0; }
  async del(key: string): Promise<number> { return Number(this.lists.delete(key) || this.sets.delete(key) || this.hashes.delete(key)); }
}

const payload = { jobId: 'job-1', repositoryId: 'repo-1' };

describe('IndexingJobQueue', () => {
  let queue: IndexingJobQueue;
  beforeEach(() => { queue = new IndexingJobQueue(new MemoryRedis(), 'test'); });

  it('enqueues once and prevents duplicate work by job id', async () => {
    await expect(queue.enqueue(payload)).resolves.toBe(true);
    await expect(queue.enqueue(payload)).resolves.toBe(false);
    await expect(queue.dequeue()).resolves.toMatchObject({ payload, retry: { attempt: 0 } });
    await expect(queue.dequeue()).resolves.toBeNull();
  });

  it('moves work through processing and acknowledges it', async () => {
    await queue.enqueue(payload);
    const job = await queue.dequeue();
    expect(job).not.toBeNull();
    await queue.acknowledge(job!);
    await expect(queue.enqueue(payload)).resolves.toBe(true);
  });

  it('retries failures up to the configured limit and then exhausts', async () => {
    await queue.enqueue(payload);
    const first = (await queue.dequeue())!;
    const retry = await queue.retry(first, 1);
    expect(retry?.retry.attempt).toBe(1);
    expect(await queue.getRetryAttempt(payload.jobId)).toBe(1);
    const second = (await queue.dequeue())!;
    await expect(queue.retry(second, 1)).resolves.toBeNull();
    await expect(queue.enqueue(payload)).resolves.toBe(true);
  });

  it('rejects incomplete payloads', async () => {
    await expect(queue.enqueue({ jobId: '', repositoryId: 'repo' })).rejects.toBeInstanceOf(QueuePayloadError);
  });

  it('releases duplicate protection when Redis cannot append the pending entry', async () => {
    const redis = new MemoryRedis();
    jest.spyOn(redis, 'rPush').mockRejectedValueOnce(new Error('Redis write failed'));
    const failedQueue = new IndexingJobQueue(redis, 'enqueue-failure');
    await expect(failedQueue.enqueue(payload)).rejects.toThrow('Redis write failed');
    await expect(failedQueue.enqueue(payload)).resolves.toBe(true);
  });
});

describe('IndexingJobService progress persistence', () => {
  const service = new IndexingJobService();
  const updatedJob = {} as never;

  afterEach(() => jest.restoreAllMocks());

  it('persists valid progress, current step, and counters through the repository layer', async () => {
    const progress = jest.spyOn(indexingJobRepository, 'updateProgress').mockResolvedValue(updatedJob);
    const statistics = jest.spyOn(indexingJobRepository, 'updateStatistics').mockResolvedValue(updatedJob);
    await service.updateProgress('job-1', {
      progress: 50,
      currentStep: 'chunking',
      filesDiscovered: 10,
      filesProcessed: 5,
      chunksCreated: 15,
      embeddingsGenerated: 15,
    });
    expect(progress).toHaveBeenCalledWith('job-1', 50, 'chunking');
    expect(statistics).toHaveBeenCalledWith('job-1', {
      filesDiscovered: 10, filesProcessed: 5, chunksCreated: 15, embeddingsGenerated: 15,
    });
  });

  it('rejects invalid progress and counter values before persistence', async () => {
    const progress = jest.spyOn(indexingJobRepository, 'updateProgress');
    const statistics = jest.spyOn(indexingJobRepository, 'updateStatistics');
    await expect(service.updateJobProgress('job-1', 101)).rejects.toThrow('between 0 and 100');
    await expect(service.updateJobStatistics('job-1', { filesProcessed: -1 })).rejects.toThrow('non-negative integer');
    expect(progress).not.toHaveBeenCalled();
    expect(statistics).not.toHaveBeenCalled();
  });
});

describe('Redis queue configuration and client errors', () => {
  const baseEnvironment = { DATABASE_URL: 'postgresql://user:password@localhost:5432/database' };

  it('accepts valid queue configuration and supplies safe defaults', () => {
    const env = parseEnvironment({ ...baseEnvironment, REDIS_URL: 'redis://localhost:6379', JOB_MAX_RETRIES: '2' });
    expect(env.JOB_QUEUE_NAME).toBe('indexing-jobs'); expect(env.JOB_MAX_RETRIES).toBe(2);
  });

  it('rejects invalid Redis URLs and negative retry counts', () => {
    expect(() => parseEnvironment({ ...baseEnvironment, REDIS_URL: 'not-a-url' })).toThrow();
    expect(() => parseEnvironment({ ...baseEnvironment, JOB_MAX_RETRIES: '-1' })).toThrow();
  });

  it('maps connection errors to an application-level Redis error', async () => {
    const redis = new RedisClient('redis://127.0.0.1:1');
    await expect(redis.ping()).rejects.toBeInstanceOf(RedisConnectionError);
  });
});

describe('IndexingJobWorker', () => {
  const durableJob = { id: 'job-1', repositoryId: 'repo-1', status: JobStatus.PENDING };
  function service() {
    return {
      startJob: jest.fn().mockResolvedValue({ ...durableJob, status: JobStatus.INDEXING }),
      completeJob: jest.fn().mockResolvedValue({ ...durableJob, status: JobStatus.COMPLETED }),
      failJob: jest.fn().mockResolvedValue({ ...durableJob, status: JobStatus.FAILED }),
      prepareRetry: jest.fn().mockResolvedValue(durableJob),
    };
  }

  it('persists successful execution before acknowledging the queue', async () => {
    const queue = new IndexingJobQueue(new MemoryRedis(), 'worker-success'); const jobs = service();
    await queue.enqueue(payload);
    const worker = new IndexingJobWorker(queue, jobs as never, jest.fn().mockResolvedValue(undefined), 2, 0);
    await expect(worker.processNext()).resolves.toEqual({ jobId: 'job-1', completed: true });
    expect(jobs.startJob).toHaveBeenCalledWith('job-1'); expect(jobs.completeJob).toHaveBeenCalledWith('job-1');
  });

  it('requeues retryable handler failures and returns persistent state to pending', async () => {
    const queue = new IndexingJobQueue(new MemoryRedis(), 'worker-retry'); const jobs = service();
    await queue.enqueue(payload);
    const worker = new IndexingJobWorker(queue, jobs as never, async () => { throw new JobHandlerError('temporary', true); }, 1, 0);
    await expect(worker.processNext()).resolves.toEqual({ jobId: 'job-1', completed: false });
    expect(jobs.failJob).toHaveBeenCalledWith('job-1', 'temporary'); expect(jobs.prepareRetry).toHaveBeenCalledWith('job-1');
  });

  it('does not retry non-retryable handler failures', async () => {
    const queue = new IndexingJobQueue(new MemoryRedis(), 'worker-fail'); const jobs = service();
    await queue.enqueue(payload);
    const worker = new IndexingJobWorker(queue, jobs as never, async () => { throw new JobHandlerError('bad request', false); }, 2, 0);
    await worker.processNext();
    expect(jobs.prepareRetry).not.toHaveBeenCalled(); expect(jobs.failJob).toHaveBeenCalledWith('job-1', 'bad request');
  });
});
