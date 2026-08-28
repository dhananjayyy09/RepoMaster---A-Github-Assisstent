import { IndexingJobService } from '../services/indexingJob.service';
import { JobHandlerError } from './queue.errors';
import { IndexingJobQueue } from './indexing-job.queue';
import { IndexingJobPayload, IndexingJobResult } from './queue.types';

export type IndexingJobHandler = (payload: IndexingJobPayload) => Promise<void>;

/** Coordinates queue work and durable state; the actual indexing handler belongs to Milestone 6B. */
export class IndexingJobWorker {
  constructor(
    private readonly queue: IndexingJobQueue,
    private readonly jobs: IndexingJobService,
    private readonly handler: IndexingJobHandler,
    private readonly maxRetries: number,
    private readonly retryDelayMs: number,
  ) {}

  async processNext(): Promise<IndexingJobResult | null> {
    const queueJob = await this.queue.dequeue();
    if (!queueJob) return null;
    await this.jobs.startJob(queueJob.payload.jobId);
    try {
      await this.handler(queueJob.payload);
      await this.jobs.completeJob(queueJob.payload.jobId);
      await this.queue.acknowledge(queueJob);
      return { jobId: queueJob.payload.jobId, completed: true };
    } catch (error) {
      const failure = this.toHandlerError(error);
      await this.jobs.failJob(queueJob.payload.jobId, failure.message);
      if (failure.retryable) {
        const retried = await this.queue.retry(queueJob, this.maxRetries, this.retryDelayMs);
        if (retried) {
          await this.jobs.prepareRetry(queueJob.payload.jobId);
          return { jobId: queueJob.payload.jobId, completed: false };
        }
      }
      await this.queue.fail(queueJob);
      return { jobId: queueJob.payload.jobId, completed: false };
    }
  }

  private toHandlerError(error: unknown): JobHandlerError {
    if (error instanceof JobHandlerError) return error;
    const message = error instanceof Error ? error.message : 'Indexing job handler failed';
    return new JobHandlerError(message, false, error);
  }
}
