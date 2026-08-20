import prisma from '../config/database';
import { Message, Prisma } from '@prisma/client';
import { handleDatabaseError } from '../utils/databaseError';

export class MessageRepository {
  async create(data: Prisma.MessageCreateInput): Promise<Message> {
    try {
      return await prisma.message.create({ data });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findById(id: string): Promise<Message | null> {
    try {
      return await prisma.message.findUnique({ 
        where: { id },
        include: { chatSession: true }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findByChatSession(chatSessionId: string, params?: {
    skip?: number;
    take?: number;
    where?: Prisma.MessageWhereInput;
    orderBy?: Prisma.MessageOrderByWithRelationInput;
  }): Promise<Message[]> {
    try {
      return await prisma.message.findMany({
        ...params,
        where: { ...params?.where, chatSessionId },
        orderBy: { createdAt: 'asc' }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.MessageWhereInput;
    orderBy?: Prisma.MessageOrderByWithRelationInput;
  }): Promise<Message[]> {
    try {
      return await prisma.message.findMany(params);
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async update(id: string, data: Prisma.MessageUpdateInput): Promise<Message> {
    try {
      return await prisma.message.update({ where: { id }, data });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async delete(id: string): Promise<Message> {
    try {
      return await prisma.message.delete({ where: { id } });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async deleteByChatSession(chatSessionId: string): Promise<{ count: number }> {
    try {
      return await prisma.message.deleteMany({ where: { chatSessionId } });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async count(where?: Prisma.MessageWhereInput): Promise<number> {
    try {
      return await prisma.message.count({ where });
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}

export const messageRepository = new MessageRepository();
