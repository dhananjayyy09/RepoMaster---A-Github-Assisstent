import request from 'supertest';
import { Application } from 'express';
import createApp from '../app';
import { chatService } from '../services/chat.service';
import { repositoryService } from '../services/repository.service';
import { userService } from '../services/user.service';
import { ragService } from '../rag';
import { MessageRole } from '@prisma/client';
import {
  AIProviderError,
  AIModelUnavailableError,
  AITimeoutError,
} from '../ai/ai.errors';
import { NotFoundError } from '../utils/errors';

// Mock the services
jest.mock('../services/chat.service');
jest.mock('../services/repository.service');
jest.mock('../services/user.service');
jest.mock('../rag', () => ({
  ...jest.requireActual('../rag'),
  ragService: {
    askQuestion: jest.fn(),
  },
}));

describe('Chat & RAG API (Milestone 8B)', () => {
  let app: Application;

  const validUUID = '123e4567-e89b-12d3-a456-426614174000';
  const validRepoId = '223e4567-e89b-12d3-a456-426614174001';
  const validSessionId = '323e4567-e89b-12d3-a456-426614174002';
  const validUserId = '423e4567-e89b-12d3-a456-426614174003';

  const mockSession = {
    id: validSessionId,
    repositoryId: validRepoId,
    userId: validUserId,
    title: 'Test Session',
    createdAt: new Date('2026-09-01T10:00:00Z'),
    updatedAt: new Date('2026-09-01T10:00:00Z'),
  };

  const mockRepo = {
    id: validRepoId,
    userId: validUserId,
    githubOwner: 'testowner',
    githubRepo: 'testrepo',
    githubUrl: 'https://github.com/testowner/testrepo',
  };

  const mockUserMessage = {
    id: 'msg-user-1',
    chatSessionId: validSessionId,
    role: MessageRole.USER,
    content: 'How does authentication work?',
    sources: null,
    createdAt: new Date('2026-09-01T10:01:00Z'),
  };

  const mockSources = [
    {
      filePath: 'src/auth/jwt.service.ts',
      language: 'typescript',
      startLine: 1,
      endLine: 25,
      score: 0.92,
    },
  ];

  const mockAssistantMessage = {
    id: 'msg-asst-1',
    chatSessionId: validSessionId,
    role: MessageRole.ASSISTANT,
    content: 'Authentication is handled via JWT tokens in JwtService.',
    sources: mockSources,
    createdAt: new Date('2026-09-01T10:01:05Z'),
  };

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    (userService.getOrCreateUser as jest.Mock).mockResolvedValue({
      id: validUserId,
      email: 'dev@repomaster.local',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================
  // 1. CHAT SESSION API
  // ==========================================
  describe('Chat Session Endpoints', () => {
    describe('POST /api/chat/sessions', () => {
      it('should create a chat session with valid repository and payload', async () => {
        (repositoryService.getRepositoryById as jest.Mock).mockResolvedValue(mockRepo);
        (chatService.createChatSession as jest.Mock).mockResolvedValue(mockSession);

        const response = await request(app)
          .post('/api/chat/sessions')
          .send({
            repositoryId: validRepoId,
            title: 'Test Session',
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(validSessionId);
        expect(chatService.createChatSession).toHaveBeenCalledWith(
          expect.objectContaining({
            repositoryId: validRepoId,
            title: 'Test Session',
          })
        );
      });

      it('should return 404 when repository does not exist', async () => {
        (repositoryService.getRepositoryById as jest.Mock).mockRejectedValue(
          new NotFoundError('Repository not found')
        );

        const response = await request(app)
          .post('/api/chat/sessions')
          .send({
            repositoryId: validRepoId,
          });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe('Repository not found');
      });

      it('should return 400 for invalid repository UUID format', async () => {
        const response = await request(app)
          .post('/api/chat/sessions')
          .send({
            repositoryId: 'not-a-uuid',
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe('Invalid request body');
      });
    });

    describe('GET /api/chat/sessions/:sessionId', () => {
      it('should return session by ID', async () => {
        (chatService.getChatSessionById as jest.Mock).mockResolvedValue(mockSession);

        const response = await request(app).get(`/api/chat/sessions/${validSessionId}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(validSessionId);
      });

      it('should also work on direct alias GET /api/chat/:sessionId', async () => {
        (chatService.getChatSessionById as jest.Mock).mockResolvedValue(mockSession);

        const response = await request(app).get(`/api/chat/${validSessionId}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(validSessionId);
      });

      it('should return 404 when session not found', async () => {
        (chatService.getChatSessionById as jest.Mock).mockRejectedValue(
          new NotFoundError('Chat session not found')
        );

        const response = await request(app).get(`/api/chat/sessions/${validSessionId}`);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe('Chat session not found');
      });

      it('should return 400 for malformed session UUID', async () => {
        const response = await request(app).get('/api/chat/sessions/invalid-uuid');

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error.message).toBe('Invalid URL parameters');
      });
    });

    describe('GET /api/chat/repositories/:repositoryId/sessions & GET /api/repositories/:id/chat', () => {
      it('should list sessions for a repository via /api/chat/repositories/:repositoryId/sessions', async () => {
        (repositoryService.getRepositoryById as jest.Mock).mockResolvedValue(mockRepo);
        (chatService.getChatSessionsByRepository as jest.Mock).mockResolvedValue([mockSession]);

        const response = await request(app).get(
          `/api/chat/repositories/${validRepoId}/sessions?skip=0&take=10`
        );

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].id).toBe(validSessionId);
      });

      it('should list sessions via repository router GET /api/repositories/:id/chat', async () => {
        (repositoryService.getRepositoryById as jest.Mock).mockResolvedValue(mockRepo);
        (chatService.getChatSessionsByRepository as jest.Mock).mockResolvedValue([mockSession]);

        const response = await request(app).get(`/api/repositories/${validRepoId}/chat`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
      });

      it('should return 404 if repository does not exist', async () => {
        (repositoryService.getRepositoryById as jest.Mock).mockRejectedValue(
          new NotFoundError('Repository not found')
        );

        const response = await request(app).get(
          `/api/chat/repositories/${validRepoId}/sessions`
        );

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/chat/sessions/:sessionId', () => {
      it('should delete a session', async () => {
        (chatService.getChatSessionById as jest.Mock).mockResolvedValue(mockSession);
        (chatService.deleteChatSession as jest.Mock).mockResolvedValue(mockSession);

        const response = await request(app).delete(`/api/chat/sessions/${validSessionId}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.message).toBe('Chat session deleted successfully');
      });
    });
  });

  // ==========================================
  // 2. ASK QUESTION & RAG INTEGRATION
  // ==========================================
  describe('Ask Question & RAG Pipeline (POST /api/chat/:sessionId/messages)', () => {
    it('should successfully ask a question, execute RAG, and persist messages', async () => {
      (chatService.getChatSessionById as jest.Mock).mockResolvedValue(mockSession);
      (chatService.createMessage as jest.Mock)
        .mockResolvedValueOnce(mockUserMessage)
        .mockResolvedValueOnce(mockAssistantMessage);
      (ragService.askQuestion as jest.Mock).mockResolvedValue({
        answer: 'Authentication is handled via JWT tokens in JwtService.',
        sources: mockSources,
      });

      const response = await request(app)
        .post(`/api/chat/${validSessionId}/messages`)
        .send({
          question: 'How does authentication work?',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.answer).toBe(
        'Authentication is handled via JWT tokens in JwtService.'
      );
      expect(response.body.data.sources).toHaveLength(1);
      expect(response.body.data.sources[0].filePath).toBe('src/auth/jwt.service.ts');
      expect(response.body.data.userMessage.id).toBe('msg-user-1');
      expect(response.body.data.assistantMessage.id).toBe('msg-asst-1');

      // Check message persistence ordering:
      // 1st call: user message
      expect(chatService.createMessage).toHaveBeenNthCalledWith(1, {
        chatSessionId: validSessionId,
        role: MessageRole.USER,
        content: 'How does authentication work?',
      });
      // 2nd call: RAG execution
      expect(ragService.askQuestion).toHaveBeenCalledWith({
        repositoryId: validRepoId,
        question: 'How does authentication work?',
      });
      // 3rd call: assistant message
      expect(chatService.createMessage).toHaveBeenNthCalledWith(2, {
        chatSessionId: validSessionId,
        role: MessageRole.ASSISTANT,
        content: 'Authentication is handled via JWT tokens in JwtService.',
        sources: mockSources,
      });
    });

    it('should handle no-context response gracefully when RAG finds no chunks', async () => {
      (chatService.getChatSessionById as jest.Mock).mockResolvedValue(mockSession);
      (chatService.createMessage as jest.Mock)
        .mockResolvedValueOnce(mockUserMessage)
        .mockResolvedValueOnce({
          ...mockAssistantMessage,
          content: "I couldn't find any relevant code or documentation in this repository.",
          sources: [],
        });
      (ragService.askQuestion as jest.Mock).mockResolvedValue({
        answer: "I couldn't find any relevant code or documentation in this repository.",
        sources: [],
      });

      const response = await request(app)
        .post(`/api/chat/sessions/${validSessionId}/messages`)
        .send({
          question: 'What is the flux capacitor rate limit?',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.answer).toContain("I couldn't find any relevant code");
      expect(response.body.data.sources).toEqual([]);
    });

    it('should return 400 for empty question', async () => {
      const response = await request(app)
        .post(`/api/chat/${validSessionId}/messages`)
        .send({
          question: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid request body');
    });

    it('should return 400 for whitespace-only question', async () => {
      const response = await request(app)
        .post(`/api/chat/${validSessionId}/messages`)
        .send({
          question: '    \n\t  ',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid request body');
    });

    it('should return 400 for oversized question (> 4096 chars)', async () => {
      const response = await request(app)
        .post(`/api/chat/${validSessionId}/messages`)
        .send({
          question: 'a'.repeat(5000),
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid request body');
    });

    it('should return 404 when sending message to non-existent session', async () => {
      (chatService.getChatSessionById as jest.Mock).mockRejectedValue(
        new NotFoundError('Chat session not found')
      );

      const response = await request(app)
        .post(`/api/chat/${validSessionId}/messages`)
        .send({
          question: 'Hello?',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Chat session not found');
    });

    it('should map AI provider errors to 502 Bad Gateway', async () => {
      (chatService.getChatSessionById as jest.Mock).mockResolvedValue(mockSession);
      (chatService.createMessage as jest.Mock).mockResolvedValue(mockUserMessage);
      (ragService.askQuestion as jest.Mock).mockRejectedValue(
        new AIProviderError('AI server unreachable')
      );

      const response = await request(app)
        .post(`/api/chat/${validSessionId}/messages`)
        .send({
          question: 'Explain the architecture',
        });

      expect(response.status).toBe(502);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('AI server unreachable');
    });

    it('should map AI model unavailable to 503 Service Unavailable', async () => {
      (chatService.getChatSessionById as jest.Mock).mockResolvedValue(mockSession);
      (chatService.createMessage as jest.Mock).mockResolvedValue(mockUserMessage);
      (ragService.askQuestion as jest.Mock).mockRejectedValue(
        new AIModelUnavailableError('llama3')
      );

      const response = await request(app)
        .post(`/api/chat/${validSessionId}/messages`)
        .send({
          question: 'Explain the architecture',
        });

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('unavailable');
    });

    it('should map timeout error to 504 Gateway Timeout', async () => {
      (chatService.getChatSessionById as jest.Mock).mockResolvedValue(mockSession);
      (chatService.createMessage as jest.Mock).mockResolvedValue(mockUserMessage);
      (ragService.askQuestion as jest.Mock).mockRejectedValue(
        new AITimeoutError('AI generation request timed out')
      );

      const response = await request(app)
        .post(`/api/chat/${validSessionId}/messages`)
        .send({
          question: 'Explain the architecture',
        });

      expect(response.status).toBe(504);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('AI generation request timed out');
    });
  });

  // ==========================================
  // 3. CHAT HISTORY API
  // ==========================================
  describe('Chat History (GET /api/chat/:sessionId/messages)', () => {
    it('should return message history in chronological order', async () => {
      (chatService.getChatSessionById as jest.Mock).mockResolvedValue(mockSession);
      (chatService.getMessagesByChatSession as jest.Mock).mockResolvedValue([
        mockUserMessage,
        mockAssistantMessage,
      ]);

      const response = await request(app).get(`/api/chat/${validSessionId}/messages`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].role).toBe('USER');
      expect(response.body.data[1].role).toBe('ASSISTANT');
      expect(response.body.data[1].sources).toHaveLength(1);
    });

    it('should return empty array for new chat session with no messages', async () => {
      (chatService.getChatSessionById as jest.Mock).mockResolvedValue(mockSession);
      (chatService.getMessagesByChatSession as jest.Mock).mockResolvedValue([]);

      const response = await request(app).get(
        `/api/chat/sessions/${validSessionId}/messages`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return 404 when querying messages of non-existent session', async () => {
      (chatService.getChatSessionById as jest.Mock).mockRejectedValue(
        new NotFoundError('Chat session not found')
      );

      const response = await request(app).get(`/api/chat/${validSessionId}/messages`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Chat session not found');
    });

    it('should return 400 for invalid session UUID format', async () => {
      const response = await request(app).get('/api/chat/invalid-session-uuid/messages');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid URL parameters');
    });
  });
});
