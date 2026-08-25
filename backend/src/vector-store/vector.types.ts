import { EmbeddingResult } from '../embeddings/embedding.types';
import { CodeChunk } from '../chunking/chunking.types';

export type DistanceMetric = 'Cosine' | 'Euclid' | 'Dot';

export interface VectorStorageConfig {
  qdrantUrl: string;
  collectionName: string;
  upsertBatchSize: number;
  timeoutMs: number;
}

export interface RepositoryChunkPayload {
  repositoryId: string;
  repositoryFileId: string;
  filePath: string;
  fileName: string;
  extension?: string;
  language: string;
  chunkIndex: number;
  totalChunks: number;
  chunkType: string;
  startLine: number;
  endLine: number;
  fileSha: string;
  repositoryOwner: string;
  repositoryName: string;
  chunkSize: number;
  [key: string]: unknown;
}

export interface VectorStorageInput {
  repositoryId: string;
  repositoryFileId: string;
  repositoryOwner: string;
  repositoryName: string;
  chunk: CodeChunk;
  embedding: EmbeddingResult;
}

export interface VectorStorageResult {
  pointId: string;
  status: 'created' | 'updated';
  collectionName: string;
}

export interface BatchVectorStorageResult {
  upsertedCount: number;
  collectionName: string;
  status: 'success' | 'partial';
}

export interface VectorDeletionResult {
  deletedCount: number;
  collectionName: string;
}

export interface CollectionConfig {
  name: string;
  vectorSize: number;
  distanceMetric: DistanceMetric;
  vectorsCount: number;
  status: 'green' | 'yellow' | 'red';
}

export interface QdrantHealthResult {
  available: boolean;
  version?: string;
  error?: string;
}
