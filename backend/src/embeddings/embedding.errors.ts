import { AppError } from '../utils/errors';

/**
 * Base error class for all embedding-related errors.
 */
export class EmbeddingError extends AppError {
  constructor(message: string, statusCode: number = 500) {
    super(statusCode, message);
    Object.setPrototypeOf(this, EmbeddingError.prototype);
  }
}

/**
 * Error thrown when the embedding provider fails to generate an embedding.
 * This is a general error for provider-specific failures.
 */
export class EmbeddingProviderError extends EmbeddingError {
  constructor(message: string = 'Embedding provider operation failed') {
    super(message, 502);
    Object.setPrototypeOf(this, EmbeddingProviderError.prototype);
  }
}

/**
 * Error thrown when the configured embedding model is unavailable.
 * This typically happens when the model is not installed or the provider is unreachable.
 */
export class EmbeddingModelUnavailableError extends EmbeddingError {
  constructor(model: string) {
    super(`Embedding model '${model}' is unavailable`, 503);
    Object.setPrototypeOf(this, EmbeddingModelUnavailableError.prototype);
  }
}

/**
 * Error thrown when the provider returns an invalid or malformed response.
 * This includes missing fields, incorrect data types, or unexpected structure.
 */
export class EmbeddingInvalidResponseError extends EmbeddingError {
  constructor(message: string = 'Invalid embedding response from provider') {
    super(message, 502);
    Object.setPrototypeOf(this, EmbeddingInvalidResponseError.prototype);
  }
}

/**
 * Error thrown when embeddings have inconsistent dimensions.
 * This is critical for vector database operations.
 */
export class EmbeddingDimensionMismatchError extends EmbeddingError {
  constructor(expected: number, actual: number) {
    super(
      `Embedding dimension mismatch: expected ${expected}, got ${actual}`,
      500
    );
    Object.setPrototypeOf(this, EmbeddingDimensionMismatchError.prototype);
  }
}

/**
 * Error thrown when the input for embedding is invalid.
 * This includes empty strings, whitespace-only text, or malformed input.
 */
export class EmbeddingInputError extends EmbeddingError {
  constructor(message: string = 'Invalid embedding input') {
    super(message, 400);
    Object.setPrototypeOf(this, EmbeddingInputError.prototype);
  }
}

/**
 * Error thrown when an embedding request times out.
 */
export class EmbeddingTimeoutError extends EmbeddingError {
  constructor(message: string = 'Embedding request timed out') {
    super(message, 504);
    Object.setPrototypeOf(this, EmbeddingTimeoutError.prototype);
  }
}
