import {
  validateEmbeddingInput,
  validateEmbeddingBatch,
  validateVector,
  validateVectorDimensions,
  hasConsistentDimensions,
  getVectorDimension,
  calculateInputLength,
  truncateText,
} from '../embeddings/embedding.utils';
import {
  EmbeddingError,
  EmbeddingProviderError,
  EmbeddingModelUnavailableError,
  EmbeddingInvalidResponseError,
  EmbeddingDimensionMismatchError,
  EmbeddingInputError,
  EmbeddingTimeoutError,
} from '../embeddings/embedding.errors';
import { OllamaEmbeddingProvider } from '../embeddings/ollama.provider';
import { EmbeddingService } from '../embeddings/embedding.service';
import type { EmbeddingProvider, EmbeddingResult } from '../embeddings/embedding.types';

// Mock fetch globally
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('Embedding Utilities', () => {
  describe('validateEmbeddingInput', () => {
    it('should accept valid text input', () => {
      expect(() => validateEmbeddingInput('Hello world')).not.toThrow();
    });

    it('should reject empty string', () => {
      expect(() => validateEmbeddingInput('')).toThrow(EmbeddingInputError);
    });

    it('should reject whitespace-only string', () => {
      expect(() => validateEmbeddingInput('   ')).toThrow(EmbeddingInputError);
    });

    it('should reject non-string input', () => {
      expect(() => validateEmbeddingInput(123 as any)).toThrow(EmbeddingInputError);
    });

    it('should reject excessively long input', () => {
      const longText = 'a'.repeat(100001);
      expect(() => validateEmbeddingInput(longText)).toThrow(EmbeddingInputError);
    });
  });

  describe('validateEmbeddingBatch', () => {
    it('should accept valid batch', () => {
      expect(() => validateEmbeddingBatch(['text1', 'text2'])).not.toThrow();
    });

    it('should reject empty batch', () => {
      expect(() => validateEmbeddingBatch([])).toThrow(EmbeddingInputError);
    });

    it('should reject non-array input', () => {
      expect(() => validateEmbeddingBatch('not an array' as any)).toThrow(EmbeddingInputError);
    });

    it('should reject batch with invalid text', () => {
      expect(() => validateEmbeddingBatch(['valid', ''])).toThrow(EmbeddingInputError);
    });

    it('should include index in error message', () => {
      try {
        validateEmbeddingBatch(['valid', '']);
        fail('Should have thrown EmbeddingInputError');
      } catch (error) {
        expect(error).toBeInstanceOf(EmbeddingInputError);
        expect((error as EmbeddingInputError).message).toContain('index 1');
      }
    });
  });

  describe('validateVector', () => {
    it('should accept valid vector', () => {
      expect(() => validateVector([1.0, 2.0, 3.0])).not.toThrow();
    });

    it('should reject non-array', () => {
      expect(() => validateVector('not an array' as any)).toThrow(EmbeddingInvalidResponseError);
    });

    it('should reject empty array', () => {
      expect(() => validateVector([])).toThrow(EmbeddingInvalidResponseError);
    });

    it('should reject vector with non-number values', () => {
      expect(() => validateVector([1.0, 'string' as any, 3.0])).toThrow(EmbeddingInvalidResponseError);
    });

    it('should reject vector with infinite values', () => {
      expect(() => validateVector([1.0, Infinity, 3.0])).toThrow(EmbeddingInvalidResponseError);
    });

    it('should reject vector with NaN values', () => {
      expect(() => validateVector([1.0, NaN, 3.0])).toThrow(EmbeddingInvalidResponseError);
    });

    it('should include index in error message for invalid values', () => {
      try {
        validateVector([1.0, Infinity, 3.0]);
        fail('Should have thrown EmbeddingInvalidResponseError');
      } catch (error) {
        expect(error).toBeInstanceOf(EmbeddingInvalidResponseError);
        expect((error as EmbeddingInvalidResponseError).message).toContain('index 1');
      }
    });
  });

  describe('validateVectorDimensions', () => {
    it('should accept vectors with consistent dimensions', () => {
      const vectors = [
        [1.0, 2.0, 3.0],
        [4.0, 5.0, 6.0],
      ];
      expect(() => validateVectorDimensions(vectors)).not.toThrow();
    });

    it('should not throw for empty array', () => {
      expect(() => validateVectorDimensions([])).not.toThrow();
    });

    it('should throw for inconsistent dimensions', () => {
      const vectors = [
        [1.0, 2.0, 3.0],
        [4.0, 5.0],
      ];
      expect(() => validateVectorDimensions(vectors)).toThrow(EmbeddingDimensionMismatchError);
    });
  });

  describe('hasConsistentDimensions', () => {
    it('should return true for empty array', () => {
      expect(hasConsistentDimensions([])).toBe(true);
    });

    it('should return true for consistent dimensions', () => {
      const vectors = [
        [1.0, 2.0, 3.0],
        [4.0, 5.0, 6.0],
        [7.0, 8.0, 9.0],
      ];
      expect(hasConsistentDimensions(vectors)).toBe(true);
    });

    it('should return false for inconsistent dimensions', () => {
      const vectors = [
        [1.0, 2.0, 3.0],
        [4.0, 5.0],
        [7.0, 8.0, 9.0],
      ];
      expect(hasConsistentDimensions(vectors)).toBe(false);
    });
  });

  describe('getVectorDimension', () => {
    it('should return correct dimension', () => {
      expect(getVectorDimension([1.0, 2.0, 3.0])).toBe(3);
      expect(getVectorDimension([1.0])).toBe(1);
      expect(getVectorDimension([])).toBe(0);
    });
  });

  describe('calculateInputLength', () => {
    it('should return character count', () => {
      expect(calculateInputLength('hello')).toBe(5);
      expect(calculateInputLength('')).toBe(0);
      expect(calculateInputLength('hello world')).toBe(11);
    });
  });

  describe('truncateText', () => {
    it('should not truncate short text', () => {
      expect(truncateText('hello', 10)).toBe('hello');
    });

    it('should truncate long text', () => {
      expect(truncateText('hello world', 5)).toBe('hello...');
    });

    it('should use default max length', () => {
      const longText = 'a'.repeat(150);
      expect(truncateText(longText)).toHaveLength(103); // 100 + '...'
    });
  });
});

describe('Embedding Errors', () => {
  it('should create EmbeddingError with correct status', () => {
    const error = new EmbeddingError('Test error', 500);
    expect(error.statusCode).toBe(500);
    expect(error.message).toBe('Test error');
  });

  it('should create EmbeddingProviderError with correct status', () => {
    const error = new EmbeddingProviderError('Provider failed');
    expect(error.statusCode).toBe(502);
    expect(error.message).toBe('Provider failed');
  });

  it('should create EmbeddingModelUnavailableError with model name', () => {
    const error = new EmbeddingModelUnavailableError('nomic-embed-text');
    expect(error.statusCode).toBe(503);
    expect(error.message).toContain('nomic-embed-text');
  });

  it('should create EmbeddingInvalidResponseError with default message', () => {
    const error = new EmbeddingInvalidResponseError();
    expect(error.statusCode).toBe(502);
    expect(error.message).toBe('Invalid embedding response from provider');
  });

  it('should create EmbeddingDimensionMismatchError with dimensions', () => {
    const error = new EmbeddingDimensionMismatchError(768, 512);
    expect(error.statusCode).toBe(500);
    expect(error.message).toContain('768');
    expect(error.message).toContain('512');
  });

  it('should create EmbeddingInputError with default message', () => {
    const error = new EmbeddingInputError();
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Invalid embedding input');
  });

  it('should create EmbeddingTimeoutError with default message', () => {
    const error = new EmbeddingTimeoutError();
    expect(error.statusCode).toBe(504);
    expect(error.message).toBe('Embedding request timed out');
  });

  it('should maintain prototype chain for instanceof checks', () => {
    const error = new EmbeddingProviderError('Test');
    expect(error instanceof EmbeddingError).toBe(true);
    expect(error instanceof EmbeddingProviderError).toBe(true);
  });
});

describe('OllamaEmbeddingProvider', () => {
  let provider: OllamaEmbeddingProvider;

  beforeEach(() => {
    provider = new OllamaEmbeddingProvider({
      baseUrl: 'http://localhost:11434',
      model: 'nomic-embed-text',
      timeout: 30000,
    });
    mockFetch.mockClear();
  });

  describe('embedText', () => {
    it('should successfully embed text', async () => {
      const mockResponse = {
        embeddings: [[0.1, 0.2, 0.3, 0.4, 0.5]],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await provider.embedText('test text');

      expect(result.vector).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
      expect(result.dimensions).toBe(5);
      expect(result.model).toBe('nomic-embed-text');
      expect(result.inputLength).toBe(9);
    });

    it('should handle model unavailable (404)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Model not found',
      } as Response);

      await expect(provider.embedText('test')).rejects.toThrow(EmbeddingModelUnavailableError);
    });

    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error',
      } as Response);

      await expect(provider.embedText('test')).rejects.toThrow(EmbeddingProviderError);
    });

    it('should handle timeout', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      
      mockFetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(abortError), 100);
        });
      });

      await expect(provider.embedText('test')).rejects.toThrow(EmbeddingTimeoutError);
    });

    it('should handle missing embedding field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await expect(provider.embedText('test')).rejects.toThrow(EmbeddingInvalidResponseError);
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new SyntaxError('Unexpected token'); },
      } as unknown as Response);

      await expect(provider.embedText('test')).rejects.toThrow(EmbeddingInvalidResponseError);
    });

    it('should handle invalid embedding (not array)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embeddings: 'not an array' }),
      } as Response);

      await expect(provider.embedText('test')).rejects.toThrow(EmbeddingInvalidResponseError);
    });

    it('should handle empty embedding', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embeddings: [] }),
      } as Response);

      await expect(provider.embedText('test')).rejects.toThrow(EmbeddingInvalidResponseError);
    });

    it('should handle embedding with invalid values', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embeddings: [[0.1, Infinity, 0.3]] }),
      } as Response);

      await expect(provider.embedText('test')).rejects.toThrow(EmbeddingInvalidResponseError);
    });

    it('should handle actual Ollama response format with embeddings array', async () => {
      const mockResponse = {
        model: 'nomic-embed-text',
        embeddings: [[0.1, 0.2, 0.3, 0.4, 0.5]],
        total_duration: 3412753700,
        load_duration: 14310900,
        prompt_eval_count: 3,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await provider.embedText('test text');

      expect(result.vector).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
      expect(result.dimensions).toBe(5);
      expect(result.model).toBe('nomic-embed-text');
      expect(result.inputLength).toBe(9);
    });
  });

  describe('embedBatch', () => {
    it('should successfully embed batch with native API', async () => {
      // Reset mock to ensure clean state
      mockFetch.mockReset();
      
      const mockResponse = {
        embeddings: [
          [0.1, 0.2, 0.3],
          [0.4, 0.5, 0.6],
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const results = await provider.embedBatch(['text1', 'text2']);

      expect(results).toHaveLength(2);
      expect(results[0].vector).toEqual([0.1, 0.2, 0.3]);
      expect(results[1].vector).toEqual([0.4, 0.5, 0.6]);
    });

    it('should handle batch API failure with sequential fallback', async () => {
      // Reset mock to ensure clean state
      mockFetch.mockReset();
      
      // First call (batch) fails with timeout
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      // Sequential calls succeed
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embeddings: [[0.1, 0.2, 0.3]] }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embeddings: [[0.4, 0.5, 0.6]] }),
      } as Response);

      const results = await provider.embedBatch(['text1', 'text2']);

      expect(results).toHaveLength(2);
      expect(results[0].vector).toEqual([0.1, 0.2, 0.3]);
      expect(results[1].vector).toEqual([0.4, 0.5, 0.6]);
    });

    it('should handle missing embeddings field', async () => {
      // Reset mock to ensure clean state
      mockFetch.mockReset();
      
      // Test native batch API with missing embeddings field
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await expect(provider.embedBatch(['text1'])).rejects.toThrow(EmbeddingInvalidResponseError);
    });

    it('should handle malformed JSON batch responses', async () => {
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new SyntaxError('Unexpected token'); },
      } as unknown as Response);

      await expect(provider.embedBatch(['text1'])).rejects.toThrow(EmbeddingInvalidResponseError);
    });

    it('should handle embedding count mismatch', async () => {
      // Reset mock to ensure clean state
      mockFetch.mockReset();
      
      // Test native batch API with count mismatch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ embeddings: [[0.1, 0.2]] }),
      } as Response);

      await expect(provider.embedBatch(['text1', 'text2'])).rejects.toThrow(EmbeddingInvalidResponseError);
    });

    it('should handle actual Ollama batch response format', async () => {
      // Reset mock to ensure clean state
      mockFetch.mockReset();
      
      const mockResponse = {
        model: 'nomic-embed-text',
        embeddings: [
          [0.1, 0.2, 0.3],
          [0.4, 0.5, 0.6],
        ],
        total_duration: 3412753700,
        load_duration: 14310900,
        prompt_eval_count: 6,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const results = await provider.embedBatch(['text1', 'text2']);

      expect(results).toHaveLength(2);
      expect(results[0].vector).toEqual([0.1, 0.2, 0.3]);
      expect(results[1].vector).toEqual([0.4, 0.5, 0.6]);
      expect(results[0].dimensions).toBe(3);
      expect(results[1].dimensions).toBe(3);
    });
  });

  describe('getter methods', () => {
    it('should return model name', () => {
      expect(provider.getModel()).toBe('nomic-embed-text');
    });

    it('should return base URL', () => {
      expect(provider.getBaseUrl()).toBe('http://localhost:11434');
    });
  });
});

describe('EmbeddingService', () => {
  let service: EmbeddingService;
  let mockProvider: jest.Mocked<EmbeddingProvider>;

  beforeEach(() => {
    mockProvider = {
      embedText: jest.fn(),
      embedBatch: jest.fn(),
    } as jest.Mocked<EmbeddingProvider>;

    service = new EmbeddingService(mockProvider, {
      batchSize: 10,
      timeoutMs: 30000,
    });
  });

  describe('embedText', () => {
    it('should successfully embed text', async () => {
      const mockResult: EmbeddingResult = {
        vector: [0.1, 0.2, 0.3],
        dimensions: 3,
        model: 'test-model',
        inputLength: 9,
      };

      mockProvider.embedText.mockResolvedValueOnce(mockResult);

      const result = await service.embedText('test text');

      expect(result).toEqual(mockResult);
      expect(mockProvider.embedText).toHaveBeenCalledWith('test text');
    });

    it('should reject empty input', async () => {
      await expect(service.embedText('')).rejects.toThrow(EmbeddingInputError);
    });

    it('should reject whitespace-only input', async () => {
      await expect(service.embedText('   ')).rejects.toThrow(EmbeddingInputError);
    });
  });

  describe('embedBatch', () => {
    it('should successfully embed small batch', async () => {
      const mockResults: EmbeddingResult[] = [
        {
          vector: [0.1, 0.2, 0.3],
          dimensions: 3,
          model: 'test-model',
          inputLength: 5,
        },
        {
          vector: [0.4, 0.5, 0.6],
          dimensions: 3,
          model: 'test-model',
          inputLength: 5,
        },
      ];

      mockProvider.embedBatch.mockResolvedValueOnce(mockResults);

      const results = await service.embedBatch(['text1', 'text2']);

      expect(results).toEqual(mockResults);
      expect(mockProvider.embedBatch).toHaveBeenCalledWith(['text1', 'text2']);
    });

    it('should reject empty batch', async () => {
      await expect(service.embedBatch([])).rejects.toThrow(EmbeddingInputError);
    });

    it('should reject batch with invalid text', async () => {
      await expect(service.embedBatch(['valid', ''])).rejects.toThrow(EmbeddingInputError);
    });

    it('should detect dimension mismatch', async () => {
      const mockResults: EmbeddingResult[] = [
        {
          vector: [0.1, 0.2, 0.3],
          dimensions: 3,
          model: 'test-model',
          inputLength: 5,
        },
        {
          vector: [0.4, 0.5],
          dimensions: 2,
          model: 'test-model',
          inputLength: 5,
        },
      ];

      mockProvider.embedBatch.mockResolvedValueOnce(mockResults);

      await expect(service.embedBatch(['text1', 'text2'])).rejects.toThrow(EmbeddingDimensionMismatchError);
    });

    it('should split large batch into chunks', async () => {
      service.updateConfig({ batchSize: 2 });

      const mockResults1: EmbeddingResult[] = [
        { vector: [0.1], dimensions: 1, model: 'test', inputLength: 1 },
        { vector: [0.2], dimensions: 1, model: 'test', inputLength: 1 },
      ];

      const mockResults2: EmbeddingResult[] = [
        { vector: [0.3], dimensions: 1, model: 'test', inputLength: 1 },
      ];

      mockProvider.embedBatch
        .mockResolvedValueOnce(mockResults1)
        .mockResolvedValueOnce(mockResults2);

      const results = await service.embedBatch(['a', 'b', 'c']);

      expect(results).toHaveLength(3);
      expect(mockProvider.embedBatch).toHaveBeenCalledTimes(2);
    });
  });

  describe('configuration', () => {
    it('should get config', () => {
      const config = service.getConfig();
      expect(config.batchSize).toBe(10);
      expect(config.timeoutMs).toBe(30000);
    });

    it('should update config', () => {
      service.updateConfig({ batchSize: 20 });
      expect(service.getConfig().batchSize).toBe(20);
    });

    it('should get provider', () => {
      expect(service.getProvider()).toBe(mockProvider);
    });

    it('should set provider', () => {
      const newProvider = {} as EmbeddingProvider;
      service.setProvider(newProvider);
      expect(service.getProvider()).toBe(newProvider);
    });
  });
});
