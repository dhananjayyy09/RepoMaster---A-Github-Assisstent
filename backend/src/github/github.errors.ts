import { AppError } from '../utils/errors';

export class GitHubInvalidUrlError extends AppError {
  constructor(message: string = 'Invalid GitHub repository URL') {
    super(400, message);
    Object.setPrototypeOf(this, GitHubInvalidUrlError.prototype);
  }
}

export class GitHubRepositoryNotFoundError extends AppError {
  constructor(message: string = 'GitHub repository not found') {
    super(404, message);
    Object.setPrototypeOf(this, GitHubRepositoryNotFoundError.prototype);
  }
}

export class GitHubRateLimitError extends AppError {
  constructor(
    message: string = 'GitHub API rate limit exceeded',
    public resetAt?: Date
  ) {
    super(429, message);
    Object.setPrototypeOf(this, GitHubRateLimitError.prototype);
  }
}

export class GitHubApiError extends AppError {
  constructor(
    message: string = 'GitHub API error',
    public statusCode: number = 500,
    public githubResponse?: unknown
  ) {
    super(statusCode, message);
    Object.setPrototypeOf(this, GitHubApiError.prototype);
  }
}

export class GitHubFileNotFoundError extends AppError {
  constructor(message: string = 'GitHub file not found') {
    super(404, message);
    Object.setPrototypeOf(this, GitHubFileNotFoundError.prototype);
  }
}

export class GitHubBinaryFileError extends AppError {
  constructor(message: string = 'GitHub file is binary and cannot be processed') {
    super(400, message);
    Object.setPrototypeOf(this, GitHubBinaryFileError.prototype);
  }
}

export class GitHubTreeTruncatedError extends AppError {
  constructor(message: string = 'GitHub repository tree is truncated and cannot be fully processed') {
    super(400, message);
    Object.setPrototypeOf(this, GitHubTreeTruncatedError.prototype);
  }
}
