import {
  EmbeddingInputError,
  EmbeddingInvalidResponseError,
  EmbeddingDimensionMismatchError,
} from './embedding.errors';

export function validateEmbeddingInput(text: string): void {
  if (typeof text !== 'string') {
    throw new EmbeddingInputError('Input must be a string');
  }

  if (text.length === 0) {
    throw new EmbeddingInputError('Input text cannot be empty');
  }

  if (text.trim().length === 0) {
    throw new EmbeddingInputError('Input text cannot be whitespace-only');
  }

  const MAX_INPUT_LENGTH = 100000;
  if (text.length > MAX_INPUT_LENGTH) {
    throw new EmbeddingInputError(
      `Input text exceeds maximum length of ${MAX_INPUT_LENGTH} characters`
    );
  }
}

export function validateEmbeddingBatch(texts: string[]): void {
  if (!Array.isArray(texts)) {
    throw new EmbeddingInputError('Batch input must be an array');
  }

  if (texts.length === 0) {
    throw new EmbeddingInputError('Batch cannot be empty');
  }

  for (let i = 0; i < texts.length; i++) {
    try {
      validateEmbeddingInput(texts[i]);
    } catch (error) {
      throw new EmbeddingInputError(
        `Invalid input at index ${i}: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }
}

export function validateVector(vector: number[]): void {
  if (!Array.isArray(vector)) {
    throw new EmbeddingInvalidResponseError('Vector must be an array');
  }

  if (vector.length === 0) {
    throw new EmbeddingInvalidResponseError('Vector cannot be empty');
  }

  for (let i = 0; i < vector.length; i++) {
    const value = vector[i];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new EmbeddingInvalidResponseError(
        `Vector contains invalid value at index ${i}: ${value}`
      );
    }
  }
}

export function validateVectorDimensions(vectors: number[][]): void {
  if (vectors.length === 0) {
    return;
  }

  const firstDimension = vectors[0].length;

  for (let i = 1; i < vectors.length; i++) {
    if (vectors[i].length !== firstDimension) {
      throw new EmbeddingDimensionMismatchError(firstDimension, vectors[i].length);
    }
  }
}

export function hasConsistentDimensions(vectors: number[][]): boolean {
  if (vectors.length === 0) {
    return true;
  }

  const firstDimension = vectors[0].length;
  return vectors.every(vector => vector.length === firstDimension);
}

export function getVectorDimension(vector: number[]): number {
  return vector.length;
}

export function calculateInputLength(text: string): number {
  return text.length;
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
}
