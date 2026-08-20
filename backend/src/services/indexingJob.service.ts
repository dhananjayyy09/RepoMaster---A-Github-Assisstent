import { indexingJobRepository } from '../repositories';
import { IndexingJob, JobStatus } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';

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

  async updateJobProgress(id: string, progress: number, currentStep?: string): Promise<IndexingJob> {
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      throw new ValidationError('Job progress must be between 0 and 100');
    }
    return indexingJobRepository.updateProgress(id, progress, currentStep);
  }

  async updateJobStatistics(id: string, stats: {
    filesDiscovered?: number;
    filesProcessed?: number;
    chunksCreated?: number;
    embeddingsGenerated?: number;
  }): Promise<IndexingJob> {
    return indexingJobRepository.updateStatistics(id, stats);
  }

  async deleteIndexingJob(id: string): Promise<IndexingJob> {
    return indexingJobRepository.delete(id);
  }
}

export const indexingJobService = new IndexingJobService();
