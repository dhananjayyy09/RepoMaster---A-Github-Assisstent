/**
 * Embedding module exports.
 * Provides a clean interface for embedding generation with provider abstraction.
 */

// Types
export type {
  EmbeddingResult,
  EmbeddingConfig,
  EmbeddingProvider,
  ProviderConfig,
} from './embedding.types';

// Errors
export {
  EmbeddingError,
  EmbeddingProviderError,
  EmbeddingModelUnavailableError,
  EmbeddingInvalidResponseError,
  EmbeddingDimensionMismatchError,
  EmbeddingInputError,
  EmbeddingTimeoutError,
} from './embedding.errors';

// Service
export { EmbeddingService } from './embedding.service';

// Provider
export { OllamaEmbeddingProvider } from './ollama.provider';

// Utilities
export {
  validateEmbeddingInput,
  validateEmbeddingBatch,
  validateVector,
  validateVectorDimensions,
  hasConsistentDimensions,
  getVectorDimension,
  calculateInputLength,
  truncateText,
} from './embedding.utils';
