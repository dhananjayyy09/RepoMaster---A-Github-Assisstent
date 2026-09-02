import { z } from 'zod';

export const createSessionSchema = z.object({
  repositoryId: z.string().uuid('Invalid repository ID format'),
  userId: z.string().uuid('Invalid user ID format').optional(),
  title: z.string().max(255, 'Title must not exceed 255 characters').optional(),
});

export const sessionIdParamsSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID format'),
});

export const repositoryIdParamsSchema = z.object({
  repositoryId: z.string().uuid('Invalid repository ID format'),
});

export const sendMessageSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, 'Question cannot be empty')
    .max(4096, 'Question must not exceed 4096 characters'),
});

export const listQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
