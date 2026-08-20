import { userRepository } from '../repositories';
import { User } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { createUserSchema, updateUserSchema } from '../validators/user.validator';

export class UserService {
  async createUser(email: string): Promise<User> {
    const validatedData = createUserSchema.parse({ email });
    return userRepository.create(validatedData);
  }

  async getUserById(id: string): Promise<User> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return userRepository.findByEmail(email);
  }

  async getOrCreateUser(email: string): Promise<User> {
    let user = await userRepository.findByEmail(email);
    if (!user) {
      user = await userRepository.create({ email });
    }
    return user;
  }

  async getAllUsers(params?: {
    skip?: number;
    take?: number;
  }): Promise<User[]> {
    return userRepository.findAll(params);
  }

  async updateUser(id: string, data: { email?: string }): Promise<User> {
    const validatedData = updateUserSchema.parse(data);
    return userRepository.update(id, validatedData);
  }

  async deleteUser(id: string): Promise<User> {
    return userRepository.delete(id);
  }
}

export const userService = new UserService();
