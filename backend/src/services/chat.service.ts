import { chatSessionRepository, messageRepository } from '../repositories';
import { ChatSession, Message } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';
import { createChatSessionSchema, updateChatSessionSchema, createMessageSchema } from '../validators/chat.validator';

export class ChatService {
  async createChatSession(data: {
    userId: string;
    repositoryId: string;
    title?: string;
  }): Promise<ChatSession> {
    const validatedData = createChatSessionSchema.parse(data);
    return chatSessionRepository.create({
      user: { connect: { id: validatedData.userId } },
      repository: { connect: { id: validatedData.repositoryId } },
      title: validatedData.title,
    });
  }

  async getChatSessionById(id: string): Promise<ChatSession> {
    const session = await chatSessionRepository.findById(id);
    if (!session) {
      throw new NotFoundError('Chat session not found');
    }
    return session;
  }

  async getChatSessionsByUser(userId: string, params?: {
    skip?: number;
    take?: number;
  }): Promise<ChatSession[]> {
    return chatSessionRepository.findByUser(userId, params);
  }

  async getChatSessionsByRepository(repositoryId: string, params?: {
    skip?: number;
    take?: number;
  }): Promise<ChatSession[]> {
    return chatSessionRepository.findByRepository(repositoryId, params);
  }

  async getChatSessionsByUserAndRepository(userId: string, repositoryId: string): Promise<ChatSession[]> {
    return chatSessionRepository.findByUserAndRepository(userId, repositoryId);
  }

  async getAllChatSessions(params?: {
    skip?: number;
    take?: number;
  }): Promise<ChatSession[]> {
    return chatSessionRepository.findAll(params);
  }

  async updateChatSession(id: string, data: { title?: string }): Promise<ChatSession> {
    const validatedData = updateChatSessionSchema.parse(data);
    return chatSessionRepository.update(id, validatedData);
  }

  async deleteChatSession(id: string): Promise<ChatSession> {
    return chatSessionRepository.delete(id);
  }

  async createMessage(data: {
    chatSessionId: string;
    role: 'USER' | 'ASSISTANT';
    content: string;
    sources?: any;
  }): Promise<Message> {
    const validatedData = createMessageSchema.parse(data);
    return messageRepository.create({
      chatSession: { connect: { id: validatedData.chatSessionId } },
      role: validatedData.role,
      content: validatedData.content,
      sources: validatedData.sources,
    });
  }

  async getMessagesByChatSession(chatSessionId: string, params?: {
    skip?: number;
    take?: number;
  }): Promise<Message[]> {
    return messageRepository.findByChatSession(chatSessionId, params);
  }

  async getMessageById(id: string): Promise<Message> {
    const message = await messageRepository.findById(id);
    if (!message) {
      throw new NotFoundError('Message not found');
    }
    return message;
  }

  async deleteMessage(id: string): Promise<Message> {
    return messageRepository.delete(id);
  }

  async deleteMessagesByChatSession(chatSessionId: string): Promise<{ count: number }> {
    return messageRepository.deleteByChatSession(chatSessionId);
  }
}

export const chatService = new ChatService();
