import { AppError } from '../utils/errors';

export class ChunkingError extends AppError {
  constructor(message: string = 'Chunking error') {
    super(500, message);
    Object.setPrototypeOf(this, ChunkingError.prototype);
  }
}

export class InvalidChunkInputError extends AppError {
  constructor(message: string = 'Invalid chunk input') {
    super(400, message);
    Object.setPrototypeOf(this, InvalidChunkInputError.prototype);
  }
}

export class ChunkingConfigurationError extends AppError {
  constructor(message: string = 'Invalid chunking configuration') {
    super(400, message);
    Object.setPrototypeOf(this, ChunkingConfigurationError.prototype);
  }
}
