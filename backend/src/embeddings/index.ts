export type {
  EmbeddingResult,
  EmbeddingConfig,
  EmbeddingProvider,
  ProviderConfig,
} from './embedding.types';

export {
  EmbeddingError,
  EmbeddingProviderError,
  EmbeddingModelUnavailableError,
  EmbeddingInvalidResponseError,
  EmbeddingDimensionMismatchError,
  EmbeddingInputError,
  EmbeddingTimeoutError,
} from './embedding.errors';

export { EmbeddingService } from './embedding.service';

export { OllamaEmbeddingProvider } from './ollama.provider';

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
