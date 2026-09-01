import { z } from 'zod';

export const importRepositorySchema = z.object({
  githubUrl: z.string().url('Invalid GitHub URL'),
  userId: z.string().uuid('Invalid user ID').optional(),
});

export const getRepositoryParamsSchema = z.object({
  id: z.string().uuid('Invalid repository ID'),
});

export const listRepositoriesQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).optional().default(0),
  take: z.coerce.number().int().min(1).max(100).optional().default(10),
});
