import { AppError } from '../utils/errors';

export class RagError extends AppError {
  constructor(message: string, statusCode: number = 500) {
    super(statusCode, message);
    Object.setPrototypeOf(this, RagError.prototype);
  }
}

export class RagInputError extends RagError {
  constructor(message: string) {
    super(message, 400);
    Object.setPrototypeOf(this, RagInputError.prototype);
  }
}

export class RagRetrievalError extends RagError {
  constructor(message: string) {
    super(message, 500);
    Object.setPrototypeOf(this, RagRetrievalError.prototype);
  }
}

export class RagContextError extends RagError {
  constructor(message: string) {
    super(message, 500);
    Object.setPrototypeOf(this, RagContextError.prototype);
  }
}

export class RagGenerationError extends RagError {
  constructor(message: string) {
    super(message, 500);
    Object.setPrototypeOf(this, RagGenerationError.prototype);
  }
}
