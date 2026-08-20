import { repositoryRepository } from '../repositories';
import { Repository, IndexingStatus } from '@prisma/client';
import { NotFoundError, ConflictError } from '../utils/errors';
import { createRepositorySchema, updateRepositorySchema } from '../validators/repository.validator';

export class RepositoryService {
  async createRepository(data: {
    userId: string;
    githubOwner: string;
    githubRepo: string;
    githubUrl: string;
    description?: string;
    defaultBranch?: string;
    stars?: number;
    forks?: number;
    primaryLanguage?: string;
  }): Promise<Repository> {
    const validatedData = createRepositorySchema.parse(data);

    // Check if repository already exists for this user
    const existing = await repositoryRepository.findByUserAndGitHubRepo(
      validatedData.userId,
      validatedData.githubOwner,
      validatedData.githubRepo
    );

    if (existing) {
      throw new ConflictError('Repository already exists for this user');
    }

    const { userId, ...repositoryData } = validatedData;
    return repositoryRepository.create({
      ...repositoryData,
      user: { connect: { id: userId } },
    });
  }

  async getRepositoryById(id: string): Promise<Repository> {
    const repository = await repositoryRepository.findById(id);
    if (!repository) {
      throw new NotFoundError('Repository not found');
    }
    return repository;
  }

  async getRepositoriesByUser(userId: string, params?: {
    skip?: number;
    take?: number;
  }): Promise<Repository[]> {
    return repositoryRepository.findAllByUser(userId, params);
  }

  async getAllRepositories(params?: {
    skip?: number;
    take?: number;
  }): Promise<Repository[]> {
    return repositoryRepository.findAll(params);
  }

  async updateRepository(id: string, data: {
    description?: string;
    stars?: number;
    forks?: number;
    primaryLanguage?: string;
    fileCount?: number;
    indexedFileCount?: number;
    chunkCount?: number;
  }): Promise<Repository> {
    const validatedData = updateRepositorySchema.parse(data);
    return repositoryRepository.update(id, validatedData);
  }

  async updateIndexingStatus(id: string, status: IndexingStatus, error?: string): Promise<Repository> {
    return repositoryRepository.updateIndexingStatus(id, status, error);
  }

  async deleteRepository(id: string): Promise<Repository> {
    return repositoryRepository.delete(id);
  }
}

export const repositoryService = new RepositoryService();
