import prisma from '../config/database';
import { IndexingJob, Prisma, JobStatus } from '@prisma/client';
import { handleDatabaseError } from '../utils/databaseError';

export class IndexingJobRepository {
  async create(data: Prisma.IndexingJobCreateInput): Promise<IndexingJob> {
    try {
      return await prisma.indexingJob.create({ data });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findById(id: string): Promise<IndexingJob | null> {
    try {
      return await prisma.indexingJob.findUnique({ 
        where: { id },
        include: { repository: true }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findByRepository(repositoryId: string, params?: {
    skip?: number;
    take?: number;
    where?: Prisma.IndexingJobWhereInput;
    orderBy?: Prisma.IndexingJobOrderByWithRelationInput;
  }): Promise<IndexingJob[]> {
    try {
      return await prisma.indexingJob.findMany({
        ...params,
        where: { ...params?.where, repositoryId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findLatestByRepository(repositoryId: string): Promise<IndexingJob | null> {
    try {
      return await prisma.indexingJob.findFirst({ 
        where: { repositoryId },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.IndexingJobWhereInput;
    orderBy?: Prisma.IndexingJobOrderByWithRelationInput;
  }): Promise<IndexingJob[]> {
    try {
      return await prisma.indexingJob.findMany(params);
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async update(id: string, data: Prisma.IndexingJobUpdateInput): Promise<IndexingJob> {
    try {
      return await prisma.indexingJob.update({ where: { id }, data });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async updateStatus(id: string, status: JobStatus, error?: string): Promise<IndexingJob> {
    try {
      const updateData: Prisma.IndexingJobUpdateInput = { status };
      
      if (status === JobStatus.INDEXING && !error) {
        updateData.startedAt = new Date();
      }
      
      if (status === JobStatus.COMPLETED || status === JobStatus.FAILED) {
        updateData.completedAt = new Date();
        if (error) {
          updateData.errorMessage = error;
        }
      }

      return await prisma.indexingJob.update({ where: { id }, data: updateData });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async updateProgress(id: string, progress: number, currentStep?: string): Promise<IndexingJob> {
    try {
      return await prisma.indexingJob.update({ 
        where: { id }, 
        data: { progress, currentStep } 
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async updateStatistics(id: string, stats: {
    filesDiscovered?: number;
    filesProcessed?: number;
    chunksCreated?: number;
    embeddingsGenerated?: number;
  }): Promise<IndexingJob> {
    try {
      return await prisma.indexingJob.update({ 
        where: { id }, 
        data: stats 
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async delete(id: string): Promise<IndexingJob> {
    try {
      return await prisma.indexingJob.delete({ where: { id } });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async count(where?: Prisma.IndexingJobWhereInput): Promise<number> {
    try {
      return await prisma.indexingJob.count({ where });
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}

export const indexingJobRepository = new IndexingJobRepository();
