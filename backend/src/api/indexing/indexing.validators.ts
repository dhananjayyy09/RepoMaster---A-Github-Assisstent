import { z } from 'zod';

export const startIndexingParamsSchema = z.object({
  repositoryId: z.string().uuid('Invalid repository ID'),
});

export const indexingJobParamsSchema = z.object({
  jobId: z.string().uuid('Invalid job ID'),
});
