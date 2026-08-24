import { config } from '../config';
import type { EmbeddingProvider, EmbeddingResult, EmbeddingConfig } from './embedding.types';
import {
  EmbeddingInputError,
  EmbeddingDimensionMismatchError,
} from './embedding.errors';
import {
  validateEmbeddingInput,
  validateEmbeddingBatch,
  validateVectorDimensions,
} from './embedding.utils';

/**
 * Service for generating embeddings using a pluggable provider.
 * This service is independent of the specific embedding provider implementation.
 */
export class EmbeddingService {
  private provider: EmbeddingProvider;
  private config: EmbeddingConfig;

  constructor(provider: EmbeddingProvider, serviceConfig?: Partial<EmbeddingConfig>) {
    this.provider = provider;
    this.config = {
      batchSize: serviceConfig?.batchSize || config.embedding.batchSize,
      timeoutMs: serviceConfig?.timeoutMs || config.ai.ollama.timeoutMs,
    };
  }

  /**
   * Generates an embedding for a single text.
   * @param text - The text to embed
   * @returns Promise resolving to an EmbeddingResult
   * @throws EmbeddingInputError if the input is invalid
   * @throws EmbeddingError if the embedding generation fails
   */
  async embedText(text: string): Promise<EmbeddingResult> {
    // Validate input
    validateEmbeddingInput(text);

    // Delegate to provider
    return await this.provider.embedText(text);
  }

  /**
   * Generates embeddings for multiple texts in batches.
   * @param texts - Array of texts to embed
   * @returns Promise resolving to an array of EmbeddingResults
   * @throws EmbeddingInputError if any input is invalid
   * @throws EmbeddingDimensionMismatchError if embeddings have inconsistent dimensions
   * @throws EmbeddingError if the embedding generation fails
   */
  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    // Validate batch input
    validateEmbeddingBatch(texts);

    // If batch size is small enough, send directly to provider
    if (texts.length <= this.config.batchSize) {
      const results = await this.provider.embedBatch(texts);
      this.validateBatchDimensions(results);
      return results;
    }

    // For larger batches, process in chunks
    return await this.embedBatchInChunks(texts);
  }

  /**
   * Processes a large batch by splitting it into smaller chunks.
   * @param texts - Array of texts to embed
   * @returns Promise resolving to an array of EmbeddingResults
   */
  private async embedBatchInChunks(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    const chunkSize = this.config.batchSize;

    for (let i = 0; i < texts.length; i += chunkSize) {
      const chunk = texts.slice(i, i + chunkSize);
      const chunkResults = await this.provider.embedBatch(chunk);
      results.push(...chunkResults);
    }

    // Validate that all results have consistent dimensions
    this.validateBatchDimensions(results);

    return results;
  }

  /**
   * Validates that all embeddings in a batch have consistent dimensions.
   * @param results - Array of embedding results to validate
   * @throws EmbeddingDimensionMismatchError if dimensions are inconsistent
   */
  private validateBatchDimensions(results: EmbeddingResult[]): void {
    if (results.length === 0) {
      return;
    }

    const firstDimension = results[0].dimensions;
    for (let i = 1; i < results.length; i++) {
      if (results[i].dimensions !== firstDimension) {
        throw new EmbeddingDimensionMismatchError(
          firstDimension,
          results[i].dimensions
        );
      }
    }
  }

  /**
   * Gets the embedding configuration.
   * @returns The current embedding configuration
   */
  getConfig(): EmbeddingConfig {
    return { ...this.config };
  }

  /**
   * Updates the embedding configuration.
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<EmbeddingConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Gets the current provider being used.
   * @returns The current embedding provider
   */
  getProvider(): EmbeddingProvider {
    return this.provider;
  }

  /**
   * Replaces the current provider with a new one.
   * @param provider - The new embedding provider
   */
  setProvider(provider: EmbeddingProvider): void {
    this.provider = provider;
  }
}
