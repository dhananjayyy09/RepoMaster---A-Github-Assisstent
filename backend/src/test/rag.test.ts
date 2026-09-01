import { RagService } from '../rag/rag.service';
import { RetrievalService } from '../rag/retrieval.service';
import { ContextBuilder } from '../rag/context.builder';
import { PromptBuilder } from '../rag/prompt.builder';
import { EmbeddingService } from '../embeddings/embedding.service';
import { AIService } from '../ai/ai.service';
import { QdrantVectorService } from '../vector-store/qdrant.service';
import { RagConfig, RetrievedChunk } from '../rag/rag.types';
import { RagInputError, RagRetrievalError, RagGenerationError } from '../rag/rag.errors';
import { VectorSearchResult } from '../vector-store/vector.types';

describe('RAG Module', () => {
  const mockConfig: RagConfig = {
    maxRetrievedChunks: 5,
    similarityThreshold: 0.7,
    maxContextChunks: 3,
  };

  const mockQdrantService = {
    searchVectors: jest.fn(),
  } as unknown as QdrantVectorService;

  const mockEmbeddingService = {
    embedText: jest.fn(),
  } as unknown as EmbeddingService;

  const mockAiService = {
    generate: jest.fn(),
  } as unknown as AIService;

  const retrievalService = new RetrievalService(mockQdrantService, mockConfig);
  const contextBuilder = new ContextBuilder(mockConfig);
  const promptBuilder = new PromptBuilder();
  const ragService = new RagService(
    mockEmbeddingService,
    retrievalService,
    contextBuilder,
    promptBuilder,
    mockAiService,
    mockConfig
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RetrievalService', () => {
    it('should retrieve and map chunks correctly', async () => {
      const mockVector = [0.1, 0.2];
      const mockRepoId = 'repo-1';

      const mockSearchResult: VectorSearchResult[] = [
        {
          pointId: 'point-1',
          score: 0.9,
          payload: {
            repositoryId: mockRepoId,
            repositoryFileId: 'file-1',
            filePath: 'src/main.ts',
            fileName: 'main.ts',
            language: 'TypeScript',
            chunkIndex: 1,
            totalChunks: 1,
            chunkType: 'CODE',
            startLine: 1,
            endLine: 10,
            fileSha: 'sha1',
            repositoryOwner: 'owner',
            repositoryName: 'repo',
            chunkSize: 100,
            content: 'console.log("Hello");',
          },
        },
      ];

      (mockQdrantService.searchVectors as jest.Mock).mockResolvedValue(mockSearchResult);

      const results = await retrievalService.search(mockVector, mockRepoId);

      expect(mockQdrantService.searchVectors).toHaveBeenCalledWith({
        vector: mockVector,
        repositoryId: mockRepoId,
        limit: 5,
        scoreThreshold: 0.7,
      });

      expect(results.length).toBe(1);
      expect(results[0].id).toBe('point-1');
      expect(results[0].content).toBe('console.log("Hello");');
    });

    it('should throw RagRetrievalError if required metadata is missing', async () => {
      (mockQdrantService.searchVectors as jest.Mock).mockResolvedValue([
        {
          pointId: 'point-invalid',
          score: 0.8,
          payload: {
            // Missing filePath, language, etc.
          },
        },
      ]);

      await expect(retrievalService.search([0.1], 'repo-1')).rejects.toThrow(RagRetrievalError);
    });

    it('should enforce repository ID', async () => {
      await expect(retrievalService.search([0.1], '')).rejects.toThrow(RagRetrievalError);
    });
  });

  describe('ContextBuilder', () => {
    it('should sort, deduplicate, and limit chunks', () => {
      const chunks: RetrievedChunk[] = [
        { id: '1', score: 0.8, filePath: 'b.ts', fileName: 'b.ts', language: 'ts', content: 'b', startLine: 1, endLine: 2, fileSha: 'sha' },
        { id: '2', score: 0.9, filePath: 'a.ts', fileName: 'a.ts', language: 'ts', content: 'a', startLine: 5, endLine: 6, fileSha: 'sha' },
        { id: '3', score: 0.7, filePath: 'a.ts', fileName: 'a.ts', language: 'ts', content: 'a2', startLine: 1, endLine: 2, fileSha: 'sha' },
        { id: '1', score: 0.8, filePath: 'b.ts', fileName: 'b.ts', language: 'ts', content: 'b', startLine: 1, endLine: 2, fileSha: 'sha' }, // duplicate
        { id: '4', score: 0.6, filePath: 'c.ts', fileName: 'c.ts', language: 'ts', content: 'c', startLine: 1, endLine: 2, fileSha: 'sha' },
      ];

      const context = contextBuilder.build(chunks);

      // Should limit to 3 (config.maxContextChunks) and deduplicate
      expect(context.chunks.length).toBe(3);
      // Top 3 by score: id 2 (0.9), id 1 (0.8), id 3 (0.7)
      expect(context.chunks.map(c => c.id)).toEqual(['2', '1', '3']);
      
      // Formatting should sort by file path then line number
      // a.ts (lines 1-2) -> a.ts (lines 5-6) -> b.ts (lines 1-2)
      expect(context.formattedContext).toContain('File: a.ts');
      expect(context.formattedContext).toContain('Lines: 1-2');
      expect(context.formattedContext.indexOf('Lines: 1-2')).toBeLessThan(context.formattedContext.indexOf('Lines: 5-6'));
    });
  });

  describe('PromptBuilder', () => {
    it('should build correct prompt', () => {
      const question = 'How does auth work?';
      const context = {
        chunks: [],
        formattedContext: 'MOCK CONTEXT CONTENT',
      };

      const prompt = promptBuilder.build(question, context);
      expect(prompt).toContain('MOCK CONTEXT CONTENT');
      expect(prompt).toContain(question);
      expect(prompt).toContain('ONLY the provided context');
    });

    it('should throw if question is empty', () => {
      expect(() => promptBuilder.build('', { chunks: [], formattedContext: 'c' })).toThrow(RagGenerationError);
    });
  });

  describe('RagService', () => {
    it('should successfully orchestrate full RAG flow', async () => {
      const mockQuestion = 'What is the entry point?';
      const mockRepoId = 'repo-xyz';

      (mockEmbeddingService.embedText as jest.Mock).mockResolvedValue({
        vector: [0.1, 0.2, 0.3],
        dimensions: 3,
        model: 'mock',
      });

      (mockQdrantService.searchVectors as jest.Mock).mockResolvedValue([
        {
          pointId: 'point-1',
          score: 0.95,
          payload: {
            repositoryId: mockRepoId,
            filePath: 'index.ts',
            language: 'ts',
            startLine: 1,
            endLine: 10,
            fileSha: 'sha',
            content: 'console.log("init");',
          },
        }
      ]);

      (mockAiService.generate as jest.Mock).mockResolvedValue({
        text: 'The entry point is index.ts.',
        model: 'llama3',
      });

      const response = await ragService.askQuestion({
        repositoryId: mockRepoId,
        question: mockQuestion,
      });

      expect(mockEmbeddingService.embedText).toHaveBeenCalledWith(mockQuestion);
      expect(mockQdrantService.searchVectors).toHaveBeenCalled();
      expect(mockAiService.generate).toHaveBeenCalled();
      
      expect(response.answer).toBe('The entry point is index.ts.');
      expect(response.sources.length).toBe(1);
      expect(response.sources[0].filePath).toBe('index.ts');
    });

    it('should short-circuit if retrieval is empty', async () => {
      (mockEmbeddingService.embedText as jest.Mock).mockResolvedValue({ vector: [0.1] });
      (mockQdrantService.searchVectors as jest.Mock).mockResolvedValue([]);

      const response = await ragService.askQuestion({
        repositoryId: 'repo-1',
        question: 'Any question?',
      });

      expect(mockEmbeddingService.embedText).toHaveBeenCalled();
      expect(mockQdrantService.searchVectors).toHaveBeenCalled();
      expect(mockAiService.generate).not.toHaveBeenCalled();
      
      expect(response.answer).toContain("couldn't find any relevant code");
      expect(response.sources.length).toBe(0);
    });

    it('should validate inputs', async () => {
      await expect(ragService.askQuestion({ repositoryId: '', question: 'q' })).rejects.toThrow(RagInputError);
      await expect(ragService.askQuestion({ repositoryId: 'r', question: '' })).rejects.toThrow(RagInputError);
    });
  });
});
