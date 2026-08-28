import { indexingJobRepository } from '../repositories';
import { IndexingJob, JobStatus } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { IndexingJobQueue, IndexingJobProgress } from '../queue';

export class IndexingJobService {
  async createIndexingJob(repositoryId: string): Promise<IndexingJob> {
    return indexingJobRepository.create({
      repository: { connect: { id: repositoryId } },
      status: JobStatus.PENDING,
    });
  }

  async getIndexingJobById(id: string): Promise<IndexingJob> {
    const job = await indexingJobRepository.findById(id);
    if (!job) {
      throw new NotFoundError('Indexing job not found');
    }
    return job;
  }

  async getJobsByRepository(repositoryId: string, params?: {
    skip?: number;
    take?: number;
  }): Promise<IndexingJob[]> {
    return indexingJobRepository.findByRepository(repositoryId, params);
  }

  async getLatestJobByRepository(repositoryId: string): Promise<IndexingJob | null> {
    return indexingJobRepository.findLatestByRepository(repositoryId);
  }

  async getAllJobs(params?: {
    skip?: number;
    take?: number;
  }): Promise<IndexingJob[]> {
    return indexingJobRepository.findAll(params);
  }

  async startJob(id: string): Promise<IndexingJob> {
    return indexingJobRepository.updateStatus(id, JobStatus.INDEXING);
  }

  async completeJob(id: string): Promise<IndexingJob> {
    return indexingJobRepository.updateStatus(id, JobStatus.COMPLETED);
  }

  async failJob(id: string, error: string): Promise<IndexingJob> {
    return indexingJobRepository.updateStatus(id, JobStatus.FAILED, error);
  }

  async enqueueJob(id: string, queue: IndexingJobQueue): Promise<boolean> {
    const job = await this.getIndexingJobById(id);
    if (job.status === JobStatus.COMPLETED) {
      throw new ValidationError('Completed indexing jobs cannot be queued');
    }
    return queue.enqueue({ jobId: job.id, repositoryId: job.repositoryId });
  }

  async createAndEnqueueIndexingJob(repositoryId: string, queue: IndexingJobQueue): Promise<IndexingJob> {
    const job = await this.createIndexingJob(repositoryId);
    await this.enqueueJob(job.id, queue);
    return job;
  }

  async prepareRetry(id: string): Promise<IndexingJob> {
    const job = await this.getIndexingJobById(id);
    if (job.status !== JobStatus.FAILED) {
      throw new ValidationError('Only failed indexing jobs can be retried');
    }
    return indexingJobRepository.update(id, { status: JobStatus.PENDING, completedAt: null });
  }

  async updateJobProgress(id: string, progress: number, currentStep?: string): Promise<IndexingJob> {
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      throw new ValidationError('Job progress must be between 0 and 100');
    }
    return indexingJobRepository.updateProgress(id, progress, currentStep);
  }

  async updateProgress(id: string, progress: IndexingJobProgress): Promise<IndexingJob> {
    await this.updateJobProgress(id, progress.progress, progress.currentStep);
    const { progress: _progress, currentStep: _currentStep, ...stats } = progress;
    return this.updateJobStatistics(id, stats);
  }

  async updateJobStatistics(id: string, stats: {
    filesDiscovered?: number;
    filesProcessed?: number;
    chunksCreated?: number;
    embeddingsGenerated?: number;
  }): Promise<IndexingJob> {
    for (const [name, value] of Object.entries(stats)) {
      if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
        throw new ValidationError(`${name} must be a non-negative integer`);
      }
    }
    return indexingJobRepository.updateStatistics(id, stats);
  }

  async deleteIndexingJob(id: string): Promise<IndexingJob> {
    return indexingJobRepository.delete(id);
  }
}

export const indexingJobService = new IndexingJobService();
