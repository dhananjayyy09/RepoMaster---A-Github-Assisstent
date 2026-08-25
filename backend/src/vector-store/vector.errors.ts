import { AppError } from '../utils/errors';

export class VectorStoreError extends AppError {
  constructor(message: string, statusCode: number = 500) {
    super(statusCode, message);
    Object.setPrototypeOf(this, VectorStoreError.prototype);
  }
}

export class QdrantConnectionError extends VectorStoreError {
  constructor(message: string = 'Failed to connect to Qdrant') {
    super(message, 503);
    Object.setPrototypeOf(this, QdrantConnectionError.prototype);
  }
}

export class QdrantCollectionError extends VectorStoreError {
  constructor(message: string = 'Qdrant collection operation failed') {
    super(message, 500);
    Object.setPrototypeOf(this, QdrantCollectionError.prototype);
  }
}

export class QdrantUpsertError extends VectorStoreError {
  constructor(message: string = 'Failed to upsert vectors to Qdrant') {
    super(message, 500);
    Object.setPrototypeOf(this, QdrantUpsertError.prototype);
  }
}

export class QdrantDeleteError extends VectorStoreError {
  constructor(message: string = 'Failed to delete vectors from Qdrant') {
    super(message, 500);
    Object.setPrototypeOf(this, QdrantDeleteError.prototype);
  }
}

export class CollectionDimensionMismatchError extends VectorStoreError {
  constructor(
    collectionName: string,
    expected: number,
    actual: number
  ) {
    super(
      `Collection dimension mismatch for '${collectionName}': expected ${expected}, got ${actual}`,
      400
    );
    Object.setPrototypeOf(this, CollectionDimensionMismatchError.prototype);
  }
}

export class VectorPayloadError extends VectorStoreError {
  constructor(message: string = 'Invalid vector payload') {
    super(message, 400);
    Object.setPrototypeOf(this, VectorPayloadError.prototype);
  }
}

export class VectorValidationError extends VectorStoreError {
  constructor(message: string = 'Vector validation failed') {
    super(message, 400);
    Object.setPrototypeOf(this, VectorValidationError.prototype);
  }
}

export class QdrantHealthError extends VectorStoreError {
  constructor(message: string = 'Qdrant health check failed') {
    super(message, 503);
    Object.setPrototypeOf(this, QdrantHealthError.prototype);
  }
}
