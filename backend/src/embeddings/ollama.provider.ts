import { config } from '../config';
import {
  EmbeddingProviderError,
  EmbeddingModelUnavailableError,
  EmbeddingInvalidResponseError,
  EmbeddingTimeoutError,
} from './embedding.errors';
import type { EmbeddingProvider, EmbeddingResult } from './embedding.types';
import { validateVector, calculateInputLength } from './embedding.utils';

/**
 * Ollama API response types.
 * These are specific to Ollama's API structure.
 */
interface OllamaEmbedRequest {
  model: string;
  input: string;
}

interface OllamaEmbedResponse {
  embeddings: number[][];
}

interface OllamaBatchEmbedRequest {
  model: string;
  input: string[];
}

interface OllamaBatchEmbedResponse {
  embeddings: number[][];
}

/**
 * Ollama-specific implementation of the EmbeddingProvider interface.
 * Handles all HTTP communication with the local Ollama instance.
 */
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  private baseUrl: string;
  private model: string;
  private timeout: number;

  constructor(options?: {
    baseUrl?: string;
    model?: string;
    timeout?: number;
  }) {
    this.baseUrl = options?.baseUrl || config.ai.ollama.baseUrl;
    this.model = options?.model || config.ai.ollama.embeddingModel;
    this.timeout = options?.timeout || config.ai.ollama.timeoutMs;
  }

  /**
   * Helper method to make HTTP requests to Ollama with timeout.
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Request timeout')) {
        throw new EmbeddingTimeoutError(
          `Ollama request timed out after ${this.timeout}ms`
        );
      }
      throw new EmbeddingProviderError(
        `Failed to connect to Ollama: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }

  /**
   * Generates an embedding for a single text using Ollama.
   */
  async embedText(text: string): Promise<EmbeddingResult> {
    const url = `${this.baseUrl}/api/embed`;
    const requestBody: OllamaEmbedRequest = {
      model: this.model,
      input: text,
    };

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new EmbeddingModelUnavailableError(this.model);
        }
        const errorText = await response.text();
        throw new EmbeddingProviderError(
          `Ollama API error (${response.status}): ${errorText || 'Unknown error'}`
        );
      }

      let data: OllamaEmbedResponse;
      try {
        data = (await response.json()) as OllamaEmbedResponse;
      } catch {
        throw new EmbeddingInvalidResponseError(
          'Ollama response was not valid JSON'
        );
      }

      if (!data.embeddings || !Array.isArray(data.embeddings) || data.embeddings.length === 0) {
        throw new EmbeddingInvalidResponseError(
          'Ollama response missing or invalid embeddings field'
        );
      }

      // Extract the first embedding for single text input
      const vector = data.embeddings[0];
      validateVector(vector);

      return {
        vector,
        dimensions: vector.length,
        model: this.model,
        inputLength: calculateInputLength(text),
      };
    } catch (error) {
      if (
        error instanceof EmbeddingTimeoutError ||
        error instanceof EmbeddingModelUnavailableError ||
        error instanceof EmbeddingInvalidResponseError
      ) {
        throw error;
      }
      throw new EmbeddingProviderError(
        `Failed to generate embedding: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    }
  }

  /**
   * Generates embeddings for multiple texts using Ollama.
   * Note: Ollama's API supports batch embedding via the /api/embed endpoint
   * with multiple prompts in newer versions. For compatibility, we'll use
   * sequential calls if batch API is not available.
   */
  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    // Try batch API first (available in newer Ollama versions)
    try {
      return await this.embedBatchNative(texts);
    } catch (error) {
      // Only fall back to sequential for network errors or API unavailability
      // Don't fall back for validation errors (those should propagate)
      if (
        error instanceof EmbeddingTimeoutError ||
        error instanceof EmbeddingModelUnavailableError ||
        (error instanceof EmbeddingProviderError && error.message.includes('Batch API'))
      ) {
        return await this.embedBatchSequential(texts);
      }
      // Re-throw validation and other errors
      throw error;
    }
  }

  /**
   * Attempts to use Ollama's native batch embedding API.
   */
  private async embedBatchNative(texts: string[]): Promise<EmbeddingResult[]> {
    const url = `${this.baseUrl}/api/embed`;
    const requestBody: OllamaBatchEmbedRequest = {
      model: this.model,
      input: texts,
    };

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new EmbeddingProviderError(
        `Ollama batch API error (${response.status})`
      );
    }

    let data: OllamaBatchEmbedResponse;
    try {
      data = (await response.json()) as OllamaBatchEmbedResponse;
    } catch {
      throw new EmbeddingInvalidResponseError(
        'Ollama batch response was not valid JSON'
      );
    }

    if (!data.embeddings || !Array.isArray(data.embeddings)) {
      throw new EmbeddingInvalidResponseError(
        'Ollama batch response missing or invalid embeddings field'
      );
    }

    if (data.embeddings.length !== texts.length) {
      throw new EmbeddingInvalidResponseError(
        `Ollama returned ${data.embeddings.length} embeddings for ${texts.length} inputs`
      );
    }

    // Validate all vectors and convert to EmbeddingResult
    return data.embeddings.map((vector, index) => {
      validateVector(vector);
      return {
        vector,
        dimensions: vector.length,
        model: this.model,
        inputLength: calculateInputLength(texts[index]),
      };
    });
  }

  /**
   * Fallback method: generates embeddings sequentially one by one.
   * Used when the batch API is not available or fails.
   */
  private async embedBatchSequential(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];

    for (let i = 0; i < texts.length; i++) {
      try {
        const result = await this.embedText(texts[i]);
        results.push(result);
      } catch (error) {
        throw new EmbeddingProviderError(
          `Failed to generate embedding for text at index ${i}: ${error instanceof Error ? error.message : 'unknown error'}`
        );
      }
    }

    return results;
  }

  /**
   * Gets the current model being used.
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Gets the current base URL.
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}
