import { z } from 'zod';
import { MessageRole } from '@prisma/client';

export const createChatSessionSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  repositoryId: z.string().uuid('Invalid repository ID'),
  title: z.string().optional(),
});

export const updateChatSessionSchema = z.object({
  title: z.string().optional(),
});

export const createMessageSchema = z.object({
  chatSessionId: z.string().uuid('Invalid chat session ID'),
  role: z.nativeEnum(MessageRole),
  content: z.string().min(1, 'Message content is required'),
  sources: z.any().optional(),
});

export type CreateChatSessionInput = z.infer<typeof createChatSessionSchema>;
export type UpdateChatSessionInput = z.infer<typeof updateChatSessionSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
