import { JobStatus } from '@prisma/client';

export type IndexingJobId = string;
export type RepositoryId = string;
export type QueueJobState = 'QUEUED' | 'PROCESSING';
export type PersistentJobStatus = JobStatus;

export interface IndexingJobPayload {
  jobId: IndexingJobId;
  repositoryId: RepositoryId;
}

export interface IndexingJobProgress {
  progress: number;
  currentStep?: string;
  filesDiscovered?: number;
  filesProcessed?: number;
  chunksCreated?: number;
  embeddingsGenerated?: number;
}

export interface JobRetryInfo {
  attempt: number;
  maxRetries: number;
  retryable: boolean;
}

export interface JobError {
  message: string;
  retryable: boolean;
  cause?: unknown;
}

export interface QueueJob {
  payload: IndexingJobPayload;
  retry: JobRetryInfo;
}

export interface IndexingJobResult {
  jobId: IndexingJobId;
  completed: boolean;
}

export interface RedisCommandClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isOpen(): boolean;
  ping(): Promise<string>;
  rPush(key: string, value: string): Promise<number>;
  lMove(source: string, destination: string, from: 'LEFT' | 'RIGHT', to: 'LEFT' | 'RIGHT'): Promise<string | null>;
  lRem(key: string, count: number, value: string): Promise<number>;
  sAdd(key: string, value: string): Promise<number>;
  sRem(key: string, value: string): Promise<number>;
  hGet(key: string, field: string): Promise<string | undefined>;
  hSet(key: string, field: string, value: string): Promise<number>;
  hDel(key: string, field: string): Promise<number>;
  del(key: string): Promise<number>;
}
