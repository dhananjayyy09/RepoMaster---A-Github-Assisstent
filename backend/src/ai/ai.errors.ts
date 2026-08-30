import { AppError } from '../utils/errors';

export class AIError extends AppError {
  constructor(message: string, statusCode: number = 500) {
    super(statusCode, message);
    Object.setPrototypeOf(this, AIError.prototype);
  }
}

export class AIProviderError extends AIError {
  constructor(message: string = 'AI provider operation failed') {
    super(message, 502);
    Object.setPrototypeOf(this, AIProviderError.prototype);
  }
}

export class AIModelUnavailableError extends AIError {
  constructor(model: string) {
    super(`AI generation model '${model}' is unavailable`, 503);
    Object.setPrototypeOf(this, AIModelUnavailableError.prototype);
  }
}

export class AIInvalidResponseError extends AIError {
  constructor(message: string = 'Invalid response from AI provider') {
    super(message, 502);
    Object.setPrototypeOf(this, AIInvalidResponseError.prototype);
  }
}

export class AITimeoutError extends AIError {
  constructor(message: string = 'AI generation request timed out') {
    super(message, 504);
    Object.setPrototypeOf(this, AITimeoutError.prototype);
  }
}

export class AIInputError extends AIError {
  constructor(message: string = 'Invalid AI generation input') {
    super(message, 400);
    Object.setPrototypeOf(this, AIInputError.prototype);
  }
}

export class AIGenerationError extends AIError {
  constructor(message: string = 'AI text generation failed') {
    super(message, 502);
    Object.setPrototypeOf(this, AIGenerationError.prototype);
  }
}
