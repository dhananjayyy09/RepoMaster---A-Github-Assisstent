import prisma from '../config/database';
import { ChatSession, Prisma } from '@prisma/client';
import { handleDatabaseError } from '../utils/databaseError';

export class ChatSessionRepository {
  async create(data: Prisma.ChatSessionCreateInput): Promise<ChatSession> {
    try {
      return await prisma.chatSession.create({ data });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findById(id: string): Promise<ChatSession | null> {
    try {
      return await prisma.chatSession.findUnique({ 
        where: { id },
        include: {
          user: true,
          repository: true,
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findByUser(userId: string, params?: {
    skip?: number;
    take?: number;
    where?: Prisma.ChatSessionWhereInput;
    orderBy?: Prisma.ChatSessionOrderByWithRelationInput;
  }): Promise<ChatSession[]> {
    try {
      return await prisma.chatSession.findMany({
        ...params,
        where: { ...params?.where, userId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findByRepository(repositoryId: string, params?: {
    skip?: number;
    take?: number;
    where?: Prisma.ChatSessionWhereInput;
    orderBy?: Prisma.ChatSessionOrderByWithRelationInput;
  }): Promise<ChatSession[]> {
    try {
      return await prisma.chatSession.findMany({
        ...params,
        where: { ...params?.where, repositoryId }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findByUserAndRepository(userId: string, repositoryId: string): Promise<ChatSession[]> {
    try {
      return await prisma.chatSession.findMany({
        where: { userId, repositoryId },
        orderBy: { updatedAt: 'desc' }
      });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    where?: Prisma.ChatSessionWhereInput;
    orderBy?: Prisma.ChatSessionOrderByWithRelationInput;
  }): Promise<ChatSession[]> {
    try {
      return await prisma.chatSession.findMany(params);
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async update(id: string, data: Prisma.ChatSessionUpdateInput): Promise<ChatSession> {
    try {
      return await prisma.chatSession.update({ where: { id }, data });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async delete(id: string): Promise<ChatSession> {
    try {
      return await prisma.chatSession.delete({ where: { id } });
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  async count(where?: Prisma.ChatSessionWhereInput): Promise<number> {
    try {
      return await prisma.chatSession.count({ where });
    } catch (error) {
      handleDatabaseError(error);
    }
  }
}

export const chatSessionRepository = new ChatSessionRepository();
