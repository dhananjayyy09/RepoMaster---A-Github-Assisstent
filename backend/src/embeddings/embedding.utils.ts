import {
  EmbeddingInputError,
  EmbeddingInvalidResponseError,
  EmbeddingDimensionMismatchError,
} from './embedding.errors';

/**
 * Validates that text input is suitable for embedding.
 * @param text - The text to validate
 * @throws EmbeddingInputError if the text is invalid
 */
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

  // Check for unreasonably long input (prevent DoS)
  const MAX_INPUT_LENGTH = 100000; // 100k characters
  if (text.length > MAX_INPUT_LENGTH) {
    throw new EmbeddingInputError(
      `Input text exceeds maximum length of ${MAX_INPUT_LENGTH} characters`
    );
  }
}

/**
 * Validates that a batch of text inputs is suitable for embedding.
 * @param texts - Array of texts to validate
 * @throws EmbeddingInputError if any text is invalid or batch is empty
 */
export function validateEmbeddingBatch(texts: string[]): void {
  if (!Array.isArray(texts)) {
    throw new EmbeddingInputError('Batch input must be an array');
  }

  if (texts.length === 0) {
    throw new EmbeddingInputError('Batch cannot be empty');
  }

  // Validate each text in the batch
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

/**
 * Validates that an embedding vector is well-formed.
 * @param vector - The vector to validate
 * @throws EmbeddingInvalidResponseError if the vector is invalid
 */
export function validateVector(vector: number[]): void {
  if (!Array.isArray(vector)) {
    throw new EmbeddingInvalidResponseError('Vector must be an array');
  }

  if (vector.length === 0) {
    throw new EmbeddingInvalidResponseError('Vector cannot be empty');
  }

  // Check that all values are finite numbers
  for (let i = 0; i < vector.length; i++) {
    const value = vector[i];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new EmbeddingInvalidResponseError(
        `Vector contains invalid value at index ${i}: ${value}`
      );
    }
  }
}

/**
 * Validates that all vectors in a batch have consistent dimensions.
 * @param vectors - Array of vectors to validate
 * @throws EmbeddingDimensionMismatchError if dimensions are inconsistent
 */
export function validateVectorDimensions(vectors: number[][]): void {
  if (vectors.length === 0) {
    return; // Empty batch is handled elsewhere
  }

  const firstDimension = vectors[0].length;

  for (let i = 1; i < vectors.length; i++) {
    if (vectors[i].length !== firstDimension) {
      throw new EmbeddingDimensionMismatchError(firstDimension, vectors[i].length);
    }
  }
}

/**
 * Checks if all vectors in a batch have consistent dimensions.
 * @param vectors - Array of vectors to check
 * @returns true if all vectors have the same dimensions, false otherwise
 */
export function hasConsistentDimensions(vectors: number[][]): boolean {
  if (vectors.length === 0) {
    return true;
  }

  const firstDimension = vectors[0].length;
  return vectors.every(vector => vector.length === firstDimension);
}

/**
 * Gets the dimension of a vector.
 * @param vector - The vector to measure
 * @returns The number of dimensions
 */
export function getVectorDimension(vector: number[]): number {
  return vector.length;
}

/**
 * Calculates the input length of a text (character count).
 * @param text - The text to measure
 * @returns The number of characters
 */
export function calculateInputLength(text: string): number {
  return text.length;
}

/**
 * Truncates text to a maximum length for display or logging.
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
}
