import prisma from '../config/database';
import { Repository, Prisma, IndexingStatus } from '@prisma/client';
import { handleDatabaseError } from '../utils/databaseError';

export class RepositoryRepository {
  async create(data: Prisma.RepositoryCreateInput): Promise<Repository> {
    try {
      return await prisma.repository.create({ data });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findById(id: string): Promise<Repository | null> {
    try {
      return await prisma.repository.findUnique({ 
        where: { id },
        include: {
          user: true,
          files: true,
          indexingJobs: true,
          chatSessions: true,
        }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findByUserAndGitHubRepo(userId: string, githubOwner: string, githubRepo: string): Promise<Repository | null> {
    try {
      return await prisma.repository.findUnique({ 
        where: { 
          userId_githubOwner_githubRepo: {
            userId,
            githubOwner,
            githubRepo
          }
        } 
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findAllByUser(userId: string, params?: {
    skip?: number;
    take?: number;
    where?: Prisma.RepositoryWhereInput;
    orderBy?: Prisma.RepositoryOrderByWithRelationInput;
  }): Promise<Repository[]> {
    try {
      return await prisma.repository.findMany({
        ...params,
        where: { ...params?.where, userId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.RepositoryWhereInput;
    orderBy?: Prisma.RepositoryOrderByWithRelationInput;
  }): Promise<Repository[]> {
    try {
      return await prisma.repository.findMany(params);
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async update(id: string, data: Prisma.RepositoryUpdateInput): Promise<Repository> {
    try {
      return await prisma.repository.update({ where: { id }, data });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async updateIndexingStatus(id: string, status: IndexingStatus, error?: string): Promise<Repository> {
    try {
      return await prisma.repository.update({ 
        where: { id }, 
        data: { 
          indexingStatus: status,
          indexingError: error,
          indexedAt: status === IndexingStatus.COMPLETED ? new Date() : null
        } 
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async delete(id: string): Promise<Repository> {
    try {
      return await prisma.repository.delete({ where: { id } });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async count(where?: Prisma.RepositoryWhereInput): Promise<number> {
    try {
      return await prisma.repository.count({ where });
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}

export const repositoryRepository = new RepositoryRepository();
