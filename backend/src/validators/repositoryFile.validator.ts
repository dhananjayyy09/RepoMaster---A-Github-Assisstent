import { z } from 'zod';

export const createRepositoryFileSchema = z.object({
  repositoryId: z.string().uuid('Invalid repository ID'),
  filePath: z.string().min(1, 'File path is required'),
  fileName: z.string().min(1, 'File name is required'),
  extension: z.string().optional(),
  language: z.string().optional(),
  fileSize: z.number().int().min(0).default(0),
  sha: z.string().optional(),
});

export const updateRepositoryFileSchema = z.object({
  language: z.string().optional(),
  chunkCount: z.number().int().min(0).optional(),
});

export type CreateRepositoryFileInput = z.infer<typeof createRepositoryFileSchema>;
export type UpdateRepositoryFileInput = z.infer<typeof updateRepositoryFileSchema>;
