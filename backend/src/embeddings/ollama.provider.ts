import { config } from '../config';
import {
  EmbeddingProviderError,
  EmbeddingModelUnavailableError,
  EmbeddingInvalidResponseError,
  EmbeddingTimeoutError,
} from './embedding.errors';
import type { EmbeddingProvider, EmbeddingResult } from './embedding.types';
import { validateVector, calculateInputLength } from './embedding.utils';

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

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      return await this.embedBatchNative(texts);
    } catch (error) {
      if (
        error instanceof EmbeddingTimeoutError ||
        error instanceof EmbeddingModelUnavailableError ||
        (error instanceof EmbeddingProviderError && error.message.includes('Batch API'))
      ) {
        return await this.embedBatchSequential(texts);
      }
      throw error;
    }
  }

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

  getModel(): string {
    return this.model;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}
