import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // We merge all parts into one object to match our single schema structures 
      // (like createRepositorySchema which expects a single object). 
      // In more advanced setups, you might separate body, query, and params schemas.
      const data = {
        ...req.body,
        ...req.query,
        ...req.params
      };
      
      const parsed = await schema.parseAsync(data);
      
      // Override with validated data (stripping unknowns depending on schema)
      // Since it's a mix, we just assign it to req.body. For production APIs, 
      // strict separation of body/params/query schemas is better, but this 
      // works for our current flat schemas.
      req.body = parsed;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // We throw an AppError so the central error handler can catch it.
        // We attach the formatted Zod issues for the frontend.
        const validationError = new ValidationError('Validation failed');
        (validationError as any).details = error.issues;
        next(validationError);
      } else {
        next(error);
      }
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req.params);
      for (const key in req.params) delete req.params[key];
      Object.assign(req.params, parsed);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = new ValidationError('Invalid URL parameters');
        (validationError as any).details = error.issues;
        next(validationError);    
      } else {
        next(error);
      }
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req.query);
      for (const key in req.query) delete req.query[key];
      Object.assign(req.query, parsed);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = new ValidationError('Invalid query parameters');
        (validationError as any).details = error.issues;
        next(validationError);
      } else {
        next(error);
      }
    }
  };
};

export const validateBody = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = new ValidationError('Invalid request body');
        (validationError as any).details = error.issues;
        next(validationError);
      } else {
        next(error);
      }
    }
  };
};
