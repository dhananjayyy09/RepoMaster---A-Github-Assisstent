import { AppError } from '../utils/errors';

export class IndexingPipelineError extends AppError {
  constructor(message: string, public readonly retryable: boolean, public readonly cause?: unknown) {
    super(retryable ? 503 : 400, message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
