-- Align persistent job status terminology with the indexing lifecycle.
ALTER TYPE "JobStatus" RENAME VALUE 'RUNNING' TO 'INDEXING';
