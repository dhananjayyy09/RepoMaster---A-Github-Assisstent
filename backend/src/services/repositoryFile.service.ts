import { repositoryFileRepository } from '../repositories';
import { RepositoryFile } from '@prisma/client';
import { NotFoundError } from '../utils/errors';
import { createRepositoryFileSchema, updateRepositoryFileSchema } from '../validators/repositoryFile.validator';

export class RepositoryFileService {
  async createRepositoryFile(data: {
    repositoryId: string;
    filePath: string;
    fileName: string;
    extension?: string;
    language?: string;
    fileSize?: number;
    sha?: string;
  }): Promise<RepositoryFile> {
    const validatedData = createRepositoryFileSchema.parse(data);
    const { repositoryId, ...fileData } = validatedData;
    return repositoryFileRepository.create({
      ...fileData,
      repository: { connect: { id: repositoryId } },
    });
  }

  async getRepositoryFileById(id: string): Promise<RepositoryFile> {
    const file = await repositoryFileRepository.findById(id);
    if (!file) {
      throw new NotFoundError('Repository file not found');
    }
    return file;
  }

  async getFilesByRepository(repositoryId: string, params?: {
    skip?: number;
    take?: number;
  }): Promise<RepositoryFile[]> {
    return repositoryFileRepository.findByRepository(repositoryId, params);
  }

  async getFileByPath(repositoryId: string, filePath: string): Promise<RepositoryFile | null> {
    return repositoryFileRepository.findByFilePath(repositoryId, filePath);
  }

  async getAllFiles(params?: {
    skip?: number;
    take?: number;
  }): Promise<RepositoryFile[]> {
    return repositoryFileRepository.findAll(params);
  }

  async updateRepositoryFile(id: string, data: {
    language?: string;
    chunkCount?: number;
  }): Promise<RepositoryFile> {
    const validatedData = updateRepositoryFileSchema.parse(data);
    return repositoryFileRepository.update(id, validatedData);
  }

  async updateChunkCount(id: string, chunkCount: number): Promise<RepositoryFile> {
    return repositoryFileRepository.updateChunkCount(id, chunkCount);
  }

  async upsertRepositoryFile(data: {
    repositoryId: string;
    filePath: string;
    fileName: string;
    extension?: string;
    language?: string;
    fileSize: number;
    sha: string;
    chunkCount: number;
  }): Promise<RepositoryFile> {
    const existing = await repositoryFileRepository.findByFilePath(data.repositoryId, data.filePath);
    if (!existing) return this.createRepositoryFile(data);
    return repositoryFileRepository.update(existing.id, {
      fileName: data.fileName,
      extension: data.extension,
      language: data.language,
      fileSize: data.fileSize,
      sha: data.sha,
      chunkCount: data.chunkCount,
      indexedAt: new Date(),
    });
  }

  async deleteRepositoryFile(id: string): Promise<RepositoryFile> {
    return repositoryFileRepository.delete(id);
  }

  async deleteFilesByRepository(repositoryId: string): Promise<{ count: number }> {
    return repositoryFileRepository.deleteByRepository(repositoryId);
  }
}

export const repositoryFileService = new RepositoryFileService();
