import prisma from '../config/database';
import { User, Prisma } from '@prisma/client';
import { handleDatabaseError } from '../utils/databaseError';

export class UserRepository {
  async create(data: Prisma.UserCreateInput): Promise<User> {
    try {
      return await prisma.user.create({ data });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({ where: { id } });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({ where: { email } });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    try {
      return await prisma.user.findMany(params);
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    try {
      return await prisma.user.update({ where: { id }, data });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async delete(id: string): Promise<User> {
    try {
      return await prisma.user.delete({ where: { id } });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async count(where?: Prisma.UserWhereInput): Promise<number> {
    try {
      return await prisma.user.count({ where });
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}

export const userRepository = new UserRepository();
