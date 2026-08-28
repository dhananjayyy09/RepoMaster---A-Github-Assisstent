import { QueuePayloadError } from './queue.errors';
import { IndexingJobPayload, QueueJob, RedisCommandClient } from './queue.types';

export class IndexingJobQueue {
  private readonly pendingKey: string;
  private readonly processingKey: string;
  private readonly membersKey: string;
  private readonly retriesKey: string;

  constructor(private readonly redis: RedisCommandClient, queueName: string) {
    const keyPrefix = `indexing:${queueName}`;
    this.pendingKey = `${keyPrefix}:pending`;
    this.processingKey = `${keyPrefix}:processing`;
    this.membersKey = `${keyPrefix}:members`;
    this.retriesKey = `${keyPrefix}:retries`;
  }

  async enqueue(payload: IndexingJobPayload): Promise<boolean> {
    this.validatePayload(payload);
    const added = await this.redis.sAdd(this.membersKey, payload.jobId);
    if (added === 0) return false;
    try {
      await this.redis.rPush(this.pendingKey, JSON.stringify({ payload, retry: { attempt: 0 } }));
    } catch (error) {
      await this.redis.sRem(this.membersKey, payload.jobId);
      throw error;
    }
    return true;
  }

  async dequeue(): Promise<QueueJob | null> {
    const raw = await this.redis.lMove(this.pendingKey, this.processingKey, 'LEFT', 'RIGHT');
    return raw === null ? null : this.parse(raw);
  }

  async acknowledge(job: QueueJob): Promise<void> {
    const raw = JSON.stringify(job);
    await this.redis.lRem(this.processingKey, 1, raw);
    await this.redis.sRem(this.membersKey, job.payload.jobId);
    await this.redis.hDel(this.retriesKey, job.payload.jobId);
  }

  async fail(job: QueueJob): Promise<void> {
    await this.redis.lRem(this.processingKey, 1, JSON.stringify(job));
    await this.redis.sRem(this.membersKey, job.payload.jobId);
  }

  async retry(job: QueueJob, maxRetries: number, delayMs = 0): Promise<QueueJob | null> {
    const attempt = job.retry.attempt + 1;
    await this.redis.lRem(this.processingKey, 1, JSON.stringify(job));
    if (attempt > maxRetries) {
      await this.redis.sRem(this.membersKey, job.payload.jobId);
      return null;
    }
    const retried: QueueJob = { payload: job.payload, retry: { attempt, maxRetries, retryable: true } };
    await this.redis.hSet(this.retriesKey, job.payload.jobId, String(attempt));
    if (delayMs > 0) await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    await this.redis.rPush(this.pendingKey, JSON.stringify(retried));
    return retried;
  }

  async getRetryAttempt(jobId: string): Promise<number> {
    const value = await this.redis.hGet(this.retriesKey, jobId);
    return value === undefined ? 0 : Number.parseInt(value, 10);
  }

  private validatePayload(payload: IndexingJobPayload): void {
    if (!payload || !payload.jobId || !payload.repositoryId) throw new QueuePayloadError('Queue payload requires a jobId and repositoryId');
  }
  private parse(raw: string): QueueJob {
    try {
      const job = JSON.parse(raw) as QueueJob;
      this.validatePayload(job.payload);
      if (!Number.isInteger(job.retry?.attempt) || job.retry.attempt < 0) throw new Error('Invalid retry attempt');
      return job;
    } catch { throw new QueuePayloadError('Queue contained an invalid indexing job payload'); }
  }
}
