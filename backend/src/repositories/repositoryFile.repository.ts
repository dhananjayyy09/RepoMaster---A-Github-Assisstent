import prisma from '../config/database';
import { RepositoryFile, Prisma } from '@prisma/client';
import { handleDatabaseError } from '../utils/databaseError';

export class RepositoryFileRepository {
  async create(data: Prisma.RepositoryFileCreateInput): Promise<RepositoryFile> {
    try {
      return await prisma.repositoryFile.create({ data });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findById(id: string): Promise<RepositoryFile | null> {
    try {
      return await prisma.repositoryFile.findUnique({
        where: { id },
        include: { repository: true },
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findByRepository(repositoryId: string, params?: {
    skip?: number;
    take?: number;
    where?: Prisma.RepositoryFileWhereInput;
    orderBy?: Prisma.RepositoryFileOrderByWithRelationInput;
  }): Promise<RepositoryFile[]> {
    try {
      return await prisma.repositoryFile.findMany({
        ...params,
        where: { ...params?.where, repositoryId },
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findByFilePath(repositoryId: string, filePath: string): Promise<RepositoryFile | null> {
    try {
      return await prisma.repositoryFile.findUnique({
        where: { repositoryId_filePath: { repositoryId, filePath } },
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.RepositoryFileWhereInput;
    orderBy?: Prisma.RepositoryFileOrderByWithRelationInput;
  }): Promise<RepositoryFile[]> {
    try {
      return await prisma.repositoryFile.findMany(params);
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async update(id: string, data: Prisma.RepositoryFileUpdateInput): Promise<RepositoryFile> {
    try {
      return await prisma.repositoryFile.update({ where: { id }, data });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async delete(id: string): Promise<RepositoryFile> {
    try {
      return await prisma.repositoryFile.delete({ where: { id } });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async deleteByRepository(repositoryId: string): Promise<{ count: number }> {
    try {
      return await prisma.repositoryFile.deleteMany({ where: { repositoryId } });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async count(where?: Prisma.RepositoryFileWhereInput): Promise<number> {
    try {
      return await prisma.repositoryFile.count({ where });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async updateChunkCount(id: string, chunkCount: number): Promise<RepositoryFile> {
    try {
      return await prisma.repositoryFile.update({
        where: { id },
        data: { chunkCount, indexedAt: new Date() },
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}

export const repositoryFileRepository = new RepositoryFileRepository();
