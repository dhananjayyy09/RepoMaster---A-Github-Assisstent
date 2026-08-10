import { Request, Response, NextFunction } from 'express';
import { AppError, InternalServerError } from '../utils/errors';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        statusCode: err.statusCode,
      },
    });
  }

  console.error('Unexpected error:', err);
  
  const internalError = new InternalServerError();
  return res.status(internalError.statusCode).json({
    error: {
      message: internalError.message,
      statusCode: internalError.statusCode,
    },
  });
};
