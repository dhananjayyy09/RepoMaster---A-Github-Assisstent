import { AppError } from '../utils/errors';

export class QueueError extends AppError {
  constructor(message: string, public readonly cause?: unknown) {
    super(500, message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class RedisConnectionError extends QueueError {}
export class QueuePayloadError extends QueueError {
  constructor(message: string) { super(message); }
}
export class JobRetryExhaustedError extends QueueError {
  constructor(message: string) { super(message); }
}
export class JobHandlerError extends QueueError {
  constructor(message: string, public readonly retryable: boolean, cause?: unknown) {
    super(message, cause);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
