import { Request, Response, NextFunction } from 'express';
import { MessageRole } from '@prisma/client';
import { chatService } from '../../services/chat.service';
import { repositoryService } from '../../services/repository.service';
import { userService } from '../../services/user.service';
import { ragService } from '../../rag';

export class ChatController {
  /**
   * Create a new chat session for a repository
   */
  async createSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { repositoryId, userId, title } = req.body as {
        repositoryId: string;
        userId?: string;
        title?: string;
      };

      // Verify repository exists
      await repositoryService.getRepositoryById(repositoryId);

      // Resolve user if not provided (fallback until auth is introduced)
      let targetUserId = userId;
      if (!targetUserId) {
        const defaultEmail = 'dev@repomaster.local';
        const defaultUser = await userService.getOrCreateUser(defaultEmail);
        targetUserId = defaultUser.id;
      }

      const session = await chatService.createChatSession({
        repositoryId,
        userId: targetUserId,
        title,
      });

      return res.status(201).json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a chat session by ID
   */
  async getSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params as { sessionId: string };

      const session = await chatService.getChatSessionById(sessionId);

      return res.status(200).json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List chat sessions for a specific repository
   */
  async listSessionsByRepository(req: Request, res: Response, next: NextFunction) {
    try {
      const repositoryId = (req.params as any).repositoryId || (req.params as any).id;
      const { skip, take } = req.query as any;

      // Verify repository exists
      await repositoryService.getRepositoryById(repositoryId);

      const sessions = await chatService.getChatSessionsByRepository(repositoryId, {
        skip: skip ? Number(skip) : undefined,
        take: take ? Number(take) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retrieve message history for a chat session
   */
  async listMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params as { sessionId: string };
      const { skip, take } = req.query as any;

      // Verify session exists
      await chatService.getChatSessionById(sessionId);

      const messages = await chatService.getMessagesByChatSession(sessionId, {
        skip: skip ? Number(skip) : undefined,
        take: take ? Number(take) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Ask a question in a chat session using RAG
   */
  async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params as { sessionId: string };
      const { question } = req.body as { question: string };

      // 1. Verify session exists and get associated repository
      const session = await chatService.getChatSessionById(sessionId);

      const normalizedQuestion = question.trim();

      // 2. Persist user message
      const userMessage = await chatService.createMessage({
        chatSessionId: sessionId,
        role: MessageRole.USER,
        content: normalizedQuestion,
      });

      // 3. Execute RAG pipeline
      const ragResponse = await ragService.askQuestion({
        repositoryId: session.repositoryId,
        question: normalizedQuestion,
      });

      // 4. Persist assistant message with sources
      const assistantMessage = await chatService.createMessage({
        chatSessionId: sessionId,
        role: MessageRole.ASSISTANT,
        content: ragResponse.answer,
        sources: ragResponse.sources,
      });

      // 5. Return standardized response
      return res.status(200).json({
        success: true,
        data: {
          sessionId,
          question: normalizedQuestion,
          answer: ragResponse.answer,
          sources: ragResponse.sources,
          userMessage,
          assistantMessage,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a chat session
   */
  async deleteSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params as { sessionId: string };

      // Verify session exists
      await chatService.getChatSessionById(sessionId);

      await chatService.deleteChatSession(sessionId);

      return res.status(200).json({
        success: true,
        data: { message: 'Chat session deleted successfully' },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const chatController = new ChatController();
