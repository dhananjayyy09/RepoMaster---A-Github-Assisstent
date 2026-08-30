import { config } from '../config';
import {
  AIProviderError,
  AIModelUnavailableError,
  AIInvalidResponseError,
  AITimeoutError,
  AIGenerationError,
} from './ai.errors';
import type { AIProvider, GenerationRequest, GenerationResponse } from './ai.types';

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream: false;
  options?: Record<string, unknown>;
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  done_reason?: string;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaAIProvider implements AIProvider {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeout: number;

  constructor(options?: {
    baseUrl?: string;
    model?: string;
    timeout?: number;
  }) {
    this.baseUrl = options?.baseUrl ?? config.ai.ollama.baseUrl;
    this.model = options?.model ?? config.ai.ollama.llmModel;
    this.timeout = options?.timeout ?? config.ai.ollama.timeoutMs;
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timerId);
      return response;
    } catch (error) {
      clearTimeout(timerId);

      if (
        error instanceof Error &&
        (error.name === 'AbortError' || error.message === 'Request timeout')
      ) {
        throw new AITimeoutError(
          `Ollama generation request timed out after ${this.timeout}ms`
        );
      }

      throw new AIProviderError(
        `Failed to connect to Ollama: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
    }
  }

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    const url = `${this.baseUrl}/api/generate`;

    const body: OllamaGenerateRequest = {
      model: this.model,
      prompt: request.prompt,
      stream: false,
    };

    if (request.options) {
      const { temperature, maxTokens, topP, topK, ...rest } = request.options;
      const ollamaOptions: Record<string, unknown> = { ...rest };

      if (temperature !== undefined) ollamaOptions.temperature = temperature;
      if (maxTokens !== undefined) ollamaOptions.num_predict = maxTokens;
      if (topP !== undefined) ollamaOptions.top_p = topP;
      if (topK !== undefined) ollamaOptions.top_k = topK;

      if (Object.keys(ollamaOptions).length > 0) {
        body.options = ollamaOptions;
      }
    }

    let response: Response;
    try {
      response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (error) {
      if (
        error instanceof AITimeoutError ||
        error instanceof AIProviderError
      ) {
        throw error;
      }
      throw new AIProviderError(
        `Failed to reach Ollama generate endpoint: ${
          error instanceof Error ? error.message : 'unknown error'
        }`
      );
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new AIModelUnavailableError(this.model);
      }

      let errorText = '';
      try {
        errorText = await response.text();
      } catch {
        // ignore body-read failure
      }

      throw new AIGenerationError(
        `Ollama API error (${response.status}): ${errorText || 'Unknown error'}`
      );
    }

    let data: OllamaGenerateResponse;
    try {
      data = (await response.json()) as OllamaGenerateResponse;
    } catch {
      throw new AIInvalidResponseError(
        'Ollama generation response was not valid JSON'
      );
    }

    if (
      !data.response ||
      typeof data.response !== 'string' ||
      data.response.trim() === ''
    ) {
      throw new AIInvalidResponseError(
        'Ollama generation response missing or empty `response` field'
      );
    }

    return {
      text: data.response,
      model: data.model ?? this.model,
      promptTokens: data.prompt_eval_count,
      completionTokens: data.eval_count,
      totalTokens:
        data.prompt_eval_count !== undefined && data.eval_count !== undefined
          ? data.prompt_eval_count + data.eval_count
          : undefined,
      finishReason: data.done_reason,
    };
  }

  getModel(): string {
    return this.model;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getTimeout(): number {
    return this.timeout;
  }
}
