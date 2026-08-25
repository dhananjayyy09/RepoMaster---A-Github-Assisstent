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

  async embedText(text: string): Promise<EmbeddingResult> {
    validateEmbeddingInput(text);

    return await this.provider.embedText(text);
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    validateEmbeddingBatch(texts);

    if (texts.length <= this.config.batchSize) {
      const results = await this.provider.embedBatch(texts);
      this.validateBatchDimensions(results);
      return results;
    }

    return await this.embedBatchInChunks(texts);
  }

  private async embedBatchInChunks(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    const chunkSize = this.config.batchSize;

    for (let i = 0; i < texts.length; i += chunkSize) {
      const chunk = texts.slice(i, i + chunkSize);
      const chunkResults = await this.provider.embedBatch(chunk);
      results.push(...chunkResults);
    }

    this.validateBatchDimensions(results);

    return results;
  }

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

  getConfig(): EmbeddingConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<EmbeddingConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  getProvider(): EmbeddingProvider {
    return this.provider;
  }

  setProvider(provider: EmbeddingProvider): void {
    this.provider = provider;
  }
}
