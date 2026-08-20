import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
