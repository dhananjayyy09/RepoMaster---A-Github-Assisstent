/**
 * Tests for vector-store module (Qdrant integration).
 * All tests use mocked Qdrant client - no live Qdrant required.
 */

import {
  QdrantVectorService,
  QdrantClientWrapper,
  generatePointId,
  validateVector,
  validatePayload,
  getVectorDimension,
  hasConsistentDimensions,
  VectorStoreError,
  QdrantConnectionError,
  QdrantCollectionError,
  QdrantUpsertError,
  QdrantDeleteError,
  CollectionDimensionMismatchError,
  VectorPayloadError,
  VectorValidationError,
} from '../vector-store';
import { CodeChunk } from '../chunking/chunking.types';
import { EmbeddingResult } from '../embeddings/embedding.types';

// Mock Qdrant client
jest.mock('@qdrant/js-client-rest', () => {
  const mockClient = {
    getCollections: jest.fn(),
    createCollection: jest.fn(),
    getCollection: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  };

  return {
    QdrantClient: jest.fn(() => mockClient),
  };
});

const { QdrantClient } = require('@qdrant/js-client-rest');

describe('Vector Store Utilities', () => {
  describe('generatePointId', () => {
    it('should generate deterministic IDs for same inputs', () => {
      const repoId = 'repo-123';
      const chunkId = 'chunk-456';
      
      const id1 = generatePointId(repoId, chunkId);
      const id2 = generatePointId(repoId, chunkId);
      
      expect(id1).toBe(id2);
      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should generate different IDs for different inputs', () => {
      const repoId = 'repo-123';
      const chunkId1 = 'chunk-456';
      const chunkId2 = 'chunk-789';
      
      const id1 = generatePointId(repoId, chunkId1);
      const id2 = generatePointId(repoId, chunkId2);
      
      expect(id1).not.toBe(id2);
    });

    it('should generate different IDs for different repositories', () => {
      const repoId1 = 'repo-123';
      const repoId2 = 'repo-456';
      const chunkId = 'chunk-789';
      
      const id1 = generatePointId(repoId1, chunkId);
      const id2 = generatePointId(repoId2, chunkId);
      
      expect(id1).not.toBe(id2);
    });
  });

  describe('validateVector', () => {
    it('should validate valid vector', () => {
      const vector = [0.1, 0.2, 0.3, 0.4];
      expect(() => validateVector(vector, 4, 'test-collection')).not.toThrow();
    });

    it('should throw for non-array input', () => {
      expect(() => validateVector('not an array' as any, 4, 'test-collection')).toThrow(
        VectorValidationError
      );
    });

    it('should throw for empty vector', () => {
      expect(() => validateVector([], 4, 'test-collection')).toThrow(VectorValidationError);
    });

    it('should throw for dimension mismatch', () => {
      const vector = [0.1, 0.2, 0.3];
      expect(() => validateVector(vector, 4, 'test-collection')).toThrow(
        CollectionDimensionMismatchError
      );
    });

    it('should throw for non-finite values', () => {
      const vector = [0.1, Infinity, 0.3, 0.4];
      expect(() => validateVector(vector, 4, 'test-collection')).toThrow(VectorValidationError);
    });

    it('should throw for NaN values', () => {
      const vector = [0.1, NaN, 0.3, 0.4];
      expect(() => validateVector(vector, 4, 'test-collection')).toThrow(VectorValidationError);
    });
  });

  describe('validatePayload', () => {
    it('should validate valid payload', () => {
      const payload = {
        repositoryId: 'repo-123',
        repositoryFileId: 'file-456',
        filePath: '/path/to/file.ts',
        fileName: 'file.ts',
        extension: 'ts',
        language: 'TypeScript',
        chunkIndex: 0,
        totalChunks: 1,
        chunkType: 'CODE',
        startLine: 1,
        endLine: 10,
        fileSha: 'abc123',
        repositoryOwner: 'owner',
        repositoryName: 'repo',
        chunkSize: 100, content: 'mock',
      };
      expect(() => validatePayload(payload)).not.toThrow();
    });

    it('should throw for missing repositoryId', () => {
      const payload = {
        repositoryId: '',
        repositoryFileId: 'file-456',
        filePath: '/path/to/file.ts',
        fileName: 'file.ts',
        language: 'TypeScript',
        chunkIndex: 0,
        totalChunks: 1,
        chunkType: 'CODE',
        startLine: 1,
        endLine: 10,
        fileSha: 'abc123',
        repositoryOwner: 'owner',
        repositoryName: 'repo',
        chunkSize: 100, content: 'mock',
      };
      expect(() => validatePayload(payload)).toThrow(VectorPayloadError);
    });

    it('should throw for invalid chunkIndex', () => {
      const payload = {
        repositoryId: 'repo-123',
        repositoryFileId: 'file-456',
        filePath: '/path/to/file.ts',
        fileName: 'file.ts',
        language: 'TypeScript',
        chunkIndex: -1,
        totalChunks: 1,
        chunkType: 'CODE',
        startLine: 1,
        endLine: 10,
        fileSha: 'abc123',
        repositoryOwner: 'owner',
        repositoryName: 'repo',
        chunkSize: 100, content: 'mock',
      };
      expect(() => validatePayload(payload)).toThrow(VectorPayloadError);
    });

    it('should throw for endLine < startLine', () => {
      const payload = {
        repositoryId: 'repo-123',
        repositoryFileId: 'file-456',
        filePath: '/path/to/file.ts',
        fileName: 'file.ts',
        language: 'TypeScript',
        chunkIndex: 0,
        totalChunks: 1,
        chunkType: 'CODE',
        startLine: 10,
        endLine: 1,
        fileSha: 'abc123',
        repositoryOwner: 'owner',
        repositoryName: 'repo',
        chunkSize: 100, content: 'mock',
      };
      expect(() => validatePayload(payload)).toThrow(VectorPayloadError);
    });
  });

  describe('getVectorDimension', () => {
    it('should return correct dimension', () => {
      const vector = [0.1, 0.2, 0.3, 0.4];
      expect(getVectorDimension(vector)).toBe(4);
    });
  });

  describe('hasConsistentDimensions', () => {
    it('should return true for empty array', () => {
      expect(hasConsistentDimensions([])).toBe(true);
    });

    it('should return true for consistent dimensions', () => {
      const vectors = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
        [0.7, 0.8, 0.9],
      ];
      expect(hasConsistentDimensions(vectors)).toBe(true);
    });

    it('should return false for inconsistent dimensions', () => {
      const vectors = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5],
        [0.7, 0.8, 0.9],
      ];
      expect(hasConsistentDimensions(vectors)).toBe(false);
    });
  });
});

describe('QdrantClientWrapper', () => {
  let clientWrapper: QdrantClientWrapper;

  beforeEach(() => {
    clientWrapper = new QdrantClientWrapper('http://localhost:6333', 30000);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkHealth', () => {
    it('should return available when Qdrant is reachable', async () => {
      const mockClient = QdrantClient();
      mockClient.getCollections.mockResolvedValue({ collections: [] });

      const result = await clientWrapper.checkHealth();
      expect(result.available).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return unavailable when Qdrant is unreachable', async () => {
      const mockClient = QdrantClient();
      mockClient.getCollections.mockRejectedValue(new Error('Connection failed'));

      const result = await clientWrapper.checkHealth();
      expect(result.available).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getUrl', () => {
    it('should return configured URL', () => {
      expect(clientWrapper.getUrl()).toBe('http://localhost:6333');
    });
  });
});

describe('QdrantVectorService', () => {
  let service: QdrantVectorService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = QdrantClient();
    service = new QdrantVectorService({
      qdrantUrl: 'http://localhost:6333',
      collectionName: 'test-collection',
      upsertBatchSize: 10,
      timeoutMs: 30000,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureCollection', () => {
    it('should create collection if it does not exist', async () => {
      mockClient.getCollections.mockResolvedValue({ collections: [] });
      mockClient.createCollection.mockResolvedValue({});

      await service.ensureCollection(768);

      expect(mockClient.createCollection).toHaveBeenCalledWith('test-collection', {
        vectors: {
          size: 768,
          distance: 'Cosine',
        },
      });
    });

    it('should reuse existing collection with matching dimension', async () => {
      mockClient.getCollections.mockResolvedValue({
        collections: [{ name: 'test-collection' }],
      });
      mockClient.getCollection.mockResolvedValue({
        config: {
          params: {
            vectors: {
              size: 768,
              distance: 'Cosine',
            },
          },
        },
        status: 'green',
      });

      await service.ensureCollection(768);

      expect(mockClient.createCollection).not.toHaveBeenCalled();
    });

    it('should throw for dimension mismatch', async () => {
      mockClient.getCollections.mockResolvedValue({
        collections: [{ name: 'test-collection' }],
      });
      mockClient.getCollection.mockResolvedValue({
        config: {
          params: {
            vectors: {
              size: 512,
              distance: 'Cosine',
            },
          },
        },
        status: 'green',
      });

      await expect(service.ensureCollection(768)).rejects.toThrow(
        CollectionDimensionMismatchError
      );
    });

    it('should throw for wrong distance metric', async () => {
      mockClient.getCollections.mockResolvedValue({
        collections: [{ name: 'test-collection' }],
      });
      mockClient.getCollection.mockResolvedValue({
        config: {
          params: {
            vectors: {
              size: 768,
              distance: 'Euclid',
            },
          },
        },
        status: 'green',
      });

      await expect(service.ensureCollection(768)).rejects.toThrow(QdrantCollectionError);
    });
  });

  describe('upsertVector', () => {
    const createMockInput = (): any => ({
      repositoryId: 'repo-123',
      repositoryFileId: 'file-456',
      repositoryOwner: 'owner',
      repositoryName: 'repo',
      chunk: {
        id: 'chunk-789',
        content: 'test content',
        filePath: '/path/to/file.ts',
        fileName: 'file.ts',
        language: 'TypeScript',
        startLine: 1,
        endLine: 10,
        chunkIndex: 0,
        totalChunks: 1,
        fileSha: 'abc123',
        size: 100,
        chunkType: 'CODE',
      },
      embedding: {
        vector: Array(768).fill(0.1),
        dimensions: 768,
        model: 'nomic-embed-text',
        inputLength: 12,
      },
    });

    it('should upsert single vector successfully', async () => {
      mockClient.getCollections.mockResolvedValue({ collections: [] });
      mockClient.createCollection.mockResolvedValue({});
      mockClient.upsert.mockResolvedValue({});

      const input = createMockInput();
      const result = await service.upsertVector(input);

      expect(result.status).toBe('updated');
      expect(result.collectionName).toBe('test-collection');
      expect(result.pointId).toBeDefined();
      expect(mockClient.upsert).toHaveBeenCalled();
    });

    it('should update existing vector with same ID', async () => {
      mockClient.getCollections.mockResolvedValue({
        collections: [{ name: 'test-collection' }],
      });
      mockClient.getCollection.mockResolvedValue({
        config: {
          params: {
            vectors: {
              size: 768,
              distance: 'Cosine',
            },
          },
        },
        status: 'green',
      });
      mockClient.upsert.mockResolvedValue({});

      const input = createMockInput();
      const result1 = await service.upsertVector(input);
      const result2 = await service.upsertVector(input);

      expect(result1.pointId).toBe(result2.pointId);
    });

    it('should throw for dimension mismatch', async () => {
      mockClient.getCollections.mockResolvedValue({
        collections: [{ name: 'test-collection' }],
      });
      mockClient.getCollection.mockResolvedValue({
        config: {
          params: {
            vectors: {
              size: 512,
              distance: 'Cosine',
            },
          },
        },
        status: 'green',
      });

      const input = createMockInput();
      await expect(service.upsertVector(input)).rejects.toThrow(
        CollectionDimensionMismatchError
      );
    });

    it('should preserve safe Qdrant validation details in upsert errors', async () => {
      mockClient.getCollections.mockResolvedValue({
        collections: [{ name: 'test-collection' }],
      });
      mockClient.getCollection.mockResolvedValue({
        config: {
          params: {
            vectors: {
              size: 768,
              distance: 'Cosine',
            },
          },
        },
      });
      mockClient.upsert.mockRejectedValue({
        message: 'Bad Request',
        data: {
          status: {
            error: 'point ID is invalid',
          },
        },
      });

      await expect(service.upsertVector(createMockInput())).rejects.toThrow(
        'point ID is invalid'
      );
    });
  });

  describe('upsertVectors', () => {
    const createMockInput = (index: number): any => ({
      repositoryId: 'repo-123',
      repositoryFileId: 'file-456',
      repositoryOwner: 'owner',
      repositoryName: 'repo',
      chunk: {
        id: `chunk-${index}`,
        content: 'test content',
        filePath: '/path/to/file.ts',
        fileName: 'file.ts',
        language: 'TypeScript',
        startLine: 1,
        endLine: 10,
        chunkIndex: index,
        totalChunks: 3,
        fileSha: 'abc123',
        size: 100,
        chunkType: 'CODE',
      },
      embedding: {
        vector: Array(768).fill(0.1),
        dimensions: 768,
        model: 'nomic-embed-text',
        inputLength: 12,
      },
    });

    it('should upsert batch of vectors successfully', async () => {
      mockClient.getCollections.mockResolvedValue({ collections: [] });
      mockClient.createCollection.mockResolvedValue({});
      mockClient.upsert.mockResolvedValue({});

      const inputs = [createMockInput(0), createMockInput(1), createMockInput(2)];
      const result = await service.upsertVectors(inputs);

      expect(result.status).toBe('success');
      expect(result.upsertedCount).toBe(3);
      expect(result.collectionName).toBe('test-collection');
    });

    it('should throw for empty batch', async () => {
      await expect(service.upsertVectors([])).rejects.toThrow(QdrantUpsertError);
    });

    it('should throw for inconsistent dimensions in batch', async () => {
      const inputs = [
        createMockInput(0),
        {
          ...createMockInput(1),
          embedding: {
            ...createMockInput(1).embedding,
            dimensions: 512,
            vector: Array(512).fill(0.1),
          },
        },
      ];

      await expect(service.upsertVectors(inputs)).rejects.toThrow(
        CollectionDimensionMismatchError
      );
    });

    it('should split large batches', async () => {
      mockClient.getCollections.mockResolvedValue({ collections: [] });
      mockClient.createCollection.mockResolvedValue({});
      mockClient.upsert.mockResolvedValue({});

      const inputs = Array.from({ length: 25 }, (_, i) => createMockInput(i));
      const result = await service.upsertVectors(inputs);

      expect(result.upsertedCount).toBe(25);
      expect(mockClient.upsert).toHaveBeenCalledTimes(3); // 10 + 10 + 5
    });
  });

  describe('deleteVector', () => {
    it('should delete single vector successfully', async () => {
      mockClient.delete.mockResolvedValue({ status: 'acknowledged' });

      const result = await service.deleteVector('point-123');

      expect(result.deletedCount).toBe(1);
      expect(result.collectionName).toBe('test-collection');
      expect(mockClient.delete).toHaveBeenCalledWith('test-collection', {
        points: ['point-123'],
      });
    });
  });

  describe('deleteRepositoryVectors', () => {
    it('should delete all repository vectors successfully', async () => {
      mockClient.delete.mockResolvedValue({ status: 'acknowledged' });

      const result = await service.deleteRepositoryVectors('repo-123');

      expect(result.deletedCount).toBe(-1); // -1 indicates unknown count
      expect(result.collectionName).toBe('test-collection');
      expect(mockClient.delete).toHaveBeenCalledWith('test-collection', {
        filter: {
          must: [
            {
              key: 'repositoryId',
              match: { value: 'repo-123' },
            },
          ],
        },
      });
    });
  });

  describe('deleteFileVectors', () => {
    it('should delete all file vectors successfully', async () => {
      mockClient.delete.mockResolvedValue({ status: 'acknowledged' });

      const result = await service.deleteFileVectors('file-456');

      expect(result.deletedCount).toBe(-1); // -1 indicates unknown count
      expect(result.collectionName).toBe('test-collection');
      expect(mockClient.delete).toHaveBeenCalledWith('test-collection', {
        filter: {
          must: [
            {
              key: 'repositoryFileId',
              match: { value: 'file-456' },
            },
          ],
        },
      });
    });
  });

  describe('getCollectionConfig', () => {
    it('should return collection config successfully', async () => {
      mockClient.getCollection.mockResolvedValue({
        config: {
          params: {
            vectors: {
              size: 768,
              distance: 'Cosine',
            },
          },
        },
        points_count: 1000,
        status: 'green',
      });

      const config = await service.getCollectionConfig();

      expect(config.name).toBe('test-collection');
      expect(config.vectorSize).toBe(768);
      expect(config.distanceMetric).toBe('Cosine');
      expect(config.vectorsCount).toBe(1000);
      expect(config.status).toBe('green');
    });
  });

  describe('checkHealth', () => {
    it('should return available when Qdrant is reachable', async () => {
      mockClient.getCollections.mockResolvedValue({ collections: [] });

      const result = await service.checkHealth();

      expect(result.available).toBe(true);
    });

    it('should return unavailable when Qdrant is unreachable', async () => {
      mockClient.getCollections.mockRejectedValue(new Error('Connection failed'));

      const result = await service.checkHealth();

      expect(result.available).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
