import { AppError } from '../utils/errors';

export class EmbeddingError extends AppError {
  constructor(message: string, statusCode: number = 500) {
    super(statusCode, message);
    Object.setPrototypeOf(this, EmbeddingError.prototype);
  }
}

export class EmbeddingProviderError extends EmbeddingError {
  constructor(message: string = 'Embedding provider operation failed') {
    super(message, 502);
    Object.setPrototypeOf(this, EmbeddingProviderError.prototype);
  }
}

export class EmbeddingModelUnavailableError extends EmbeddingError {
  constructor(model: string) {
    super(`Embedding model '${model}' is unavailable`, 503);
    Object.setPrototypeOf(this, EmbeddingModelUnavailableError.prototype);
  }
}

export class EmbeddingInvalidResponseError extends EmbeddingError {
  constructor(message: string = 'Invalid embedding response from provider') {
    super(message, 502);
    Object.setPrototypeOf(this, EmbeddingInvalidResponseError.prototype);
  }
}

export class EmbeddingDimensionMismatchError extends EmbeddingError {
  constructor(expected: number, actual: number) {
    super(
      `Embedding dimension mismatch: expected ${expected}, got ${actual}`,
      500
    );
    Object.setPrototypeOf(this, EmbeddingDimensionMismatchError.prototype);
  }
}

export class EmbeddingInputError extends EmbeddingError {
  constructor(message: string = 'Invalid embedding input') {
    super(message, 400);
    Object.setPrototypeOf(this, EmbeddingInputError.prototype);
  }
}

export class EmbeddingTimeoutError extends EmbeddingError {
  constructor(message: string = 'Embedding request timed out') {
    super(message, 504);
    Object.setPrototypeOf(this, EmbeddingTimeoutError.prototype);
  }
}
