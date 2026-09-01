import { Request, Response, NextFunction } from 'express';
import { AppError, InternalServerError } from '../utils/errors';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    const errorDetails: any = {
      code: err.statusCode,
      message: err.message,
    };
    
    if ((err as any).details) {
      errorDetails.details = (err as any).details;
    }

    return res.status(err.statusCode).json({
      success: false,
      error: errorDetails,
    });
  }

  console.error('Unexpected error:', err);
  
  const internalError = new InternalServerError();
  return res.status(internalError.statusCode).json({
    success: false,
    error: {
      code: internalError.statusCode,
      message: internalError.message,
    },
  });
};
