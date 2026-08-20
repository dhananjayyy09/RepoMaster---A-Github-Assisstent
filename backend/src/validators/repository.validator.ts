import { z } from 'zod';

export const createRepositorySchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  githubOwner: z.string().min(1, 'GitHub owner is required'),
  githubRepo: z.string().min(1, 'GitHub repository name is required'),
  githubUrl: z.string().url('Invalid GitHub URL'),
  description: z.string().optional(),
  defaultBranch: z.string().min(1).default('main'),
  stars: z.number().int().min(0).default(0),
  forks: z.number().int().min(0).default(0),
  primaryLanguage: z.string().optional(),
});

export const updateRepositorySchema = z.object({
  description: z.string().optional(),
  stars: z.number().int().min(0).optional(),
  forks: z.number().int().min(0).optional(),
  primaryLanguage: z.string().optional(),
  fileCount: z.number().int().min(0).optional(),
  indexedFileCount: z.number().int().min(0).optional(),
  chunkCount: z.number().int().min(0).optional(),
});

export type CreateRepositoryInput = z.infer<typeof createRepositorySchema>;
export type UpdateRepositoryInput = z.infer<typeof updateRepositorySchema>;
