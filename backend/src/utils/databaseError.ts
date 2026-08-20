import { Prisma } from '@prisma/client';
import { ConflictError, DatabaseError, NotFoundError, ValidationError } from './errors';

export function handleDatabaseError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        throw new ConflictError('Resource already exists');
      case 'P2025':
        throw new NotFoundError();
      case 'P2003':
        throw new ValidationError('The referenced resource does not exist');
      case 'P2014':
        throw new ValidationError('The change would violate a required relationship');
      default:
        throw new DatabaseError(`Database error: ${error.message}`);
    }
  }
  
  if (error instanceof Prisma.PrismaClientValidationError) {
    throw new ValidationError('Invalid database input');
  }
  
  if (error instanceof Prisma.PrismaClientInitializationError) {
    throw new DatabaseError('Failed to initialize database connection');
  }
  
  throw new DatabaseError('An unexpected database error occurred');
}
