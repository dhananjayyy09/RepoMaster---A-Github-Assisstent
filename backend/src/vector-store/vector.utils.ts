import { createHash } from 'node:crypto';
import { VectorValidationError, VectorPayloadError, CollectionDimensionMismatchError } from './vector.errors';
import { RepositoryChunkPayload } from './vector.types';

export function generatePointId(repositoryId: string, chunkId: string): string {
  const digest = createHash('sha256')
    .update(`${repositoryId}:${chunkId}`)
    .digest('hex');
  const variantNibble = ((parseInt(digest[16], 16) & 0x03) | 0x08).toString(16);

  return [
    digest.slice(0, 8),
    digest.slice(8, 12),
    `5${digest.slice(13, 16)}`,
    `${variantNibble}${digest.slice(17, 20)}`,
    digest.slice(20, 32),
  ].join('-');
}

export function validateVector(
  vector: number[],
  expectedDimension: number,
  collectionName: string = 'unknown'
): void {
  if (!Array.isArray(vector)) {
    throw new VectorValidationError('Vector must be an array');
  }

  if (vector.length === 0) {
    throw new VectorValidationError('Vector cannot be empty');
  }

  if (vector.length !== expectedDimension) {
    throw new CollectionDimensionMismatchError(
      collectionName,
      expectedDimension,
      vector.length
    );
  }

  for (let i = 0; i < vector.length; i++) {
    const value = vector[i];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new VectorValidationError(
        `Vector contains invalid value at index ${i}: ${value}`
      );
    }
  }
}

export function validatePayload(payload: RepositoryChunkPayload): void {
  if (!payload.repositoryId || typeof payload.repositoryId !== 'string') {
    throw new VectorPayloadError('Payload must have a valid repositoryId');
  }

  if (!payload.repositoryFileId || typeof payload.repositoryFileId !== 'string') {
    throw new VectorPayloadError('Payload must have a valid repositoryFileId');
  }

  if (!payload.filePath || typeof payload.filePath !== 'string') {
    throw new VectorPayloadError('Payload must have a valid filePath');
  }

  if (!payload.fileName || typeof payload.fileName !== 'string') {
    throw new VectorPayloadError('Payload must have a valid fileName');
  }

  if (!payload.language || typeof payload.language !== 'string') {
    throw new VectorPayloadError('Payload must have a valid language');
  }

  if (typeof payload.chunkIndex !== 'number' || payload.chunkIndex < 0) {
    throw new VectorPayloadError('Payload must have a valid chunkIndex (>= 0)');
  }

  if (typeof payload.totalChunks !== 'number' || payload.totalChunks <= 0) {
    throw new VectorPayloadError('Payload must have a valid totalChunks (> 0)');
  }

  if (typeof payload.startLine !== 'number' || payload.startLine < 1) {
    throw new VectorPayloadError('Payload must have a valid startLine (>= 1)');
  }

  if (typeof payload.endLine !== 'number' || payload.endLine < 1) {
    throw new VectorPayloadError('Payload must have a valid endLine (>= 1)');
  }

  if (payload.endLine < payload.startLine) {
    throw new VectorPayloadError('Payload endLine must be >= startLine');
  }

  if (!payload.fileSha || typeof payload.fileSha !== 'string') {
    throw new VectorPayloadError('Payload must have a valid fileSha');
  }

  if (!payload.repositoryOwner || typeof payload.repositoryOwner !== 'string') {
    throw new VectorPayloadError('Payload must have a valid repositoryOwner');
  }

  if (!payload.repositoryName || typeof payload.repositoryName !== 'string') {
    throw new VectorPayloadError('Payload must have a valid repositoryName');
  }

  if (typeof payload.chunkSize !== 'number' || payload.chunkSize < 0) {
    throw new VectorPayloadError('Payload must have a valid chunkSize (>= 0)');
  }
}

export function getVectorDimension(vector: number[]): number {
  return vector.length;
}

export function hasConsistentDimensions(vectors: number[][]): boolean {
  if (vectors.length === 0) {
    return true;
  }

  const firstDimension = vectors[0].length;
  return vectors.every(vector => vector.length === firstDimension);
}
