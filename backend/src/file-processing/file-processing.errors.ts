import { AppError } from '../utils/errors';

export class FileProcessingError extends AppError {
  constructor(message: string = 'File processing error') {
    super(500, message);
    Object.setPrototypeOf(this, FileProcessingError.prototype);
  }
}

export class UnsupportedFileError extends AppError {
  constructor(message: string = 'Unsupported file type') {
    super(400, message);
    Object.setPrototypeOf(this, UnsupportedFileError.prototype);
  }
}

export class BinaryFileError extends AppError {
  constructor(message: string = 'Binary file detected') {
    super(400, message);
    Object.setPrototypeOf(this, BinaryFileError.prototype);
  }
}

export class FileTooLargeError extends AppError {
  constructor(message: string = 'File exceeds size limit') {
    super(400, message);
    Object.setPrototypeOf(this, FileTooLargeError.prototype);
  }
}
