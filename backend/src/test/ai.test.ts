import {
  AIError,
  AIProviderError,
  AIModelUnavailableError,
  AIInvalidResponseError,
  AITimeoutError,
  AIInputError,
  AIGenerationError,
} from '../ai/ai.errors';
import { OllamaAIProvider } from '../ai/ollama.ai.provider';
import { AIService } from '../ai/ai.service';
import type {
  AIProvider,
  GenerationRequest,
  GenerationResponse,
  GenerationConfig,
} from '../ai/ai.types';

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

function makeOllamaResponse(overrides: Partial<{
  model: string;
  response: string;
  done: boolean;
  done_reason: string;
  prompt_eval_count: number;
  eval_count: number;
}> = {}): object {
  return {
    model: 'llama3',
    created_at: '2024-01-01T00:00:00Z',
    response: 'The answer is 42.',
    done: true,
    done_reason: 'stop',
    prompt_eval_count: 10,
    eval_count: 5,
    ...overrides,
  };
}

function mockSuccessResponse(body: object = makeOllamaResponse()): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response);
}

function mockHttpError(status: number, text = 'Server error'): void {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => { throw new Error('not json'); },
    text: async () => text,
  } as unknown as Response);
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('AI Error Hierarchy', () => {
  it('AIError is instanceof Error and AIError', () => {
    const err = new AIError('base', 500);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AIError);
    expect(err.statusCode).toBe(500);
    expect(err.message).toBe('base');
  });

  it('AIProviderError is instanceof AIError (502)', () => {
    const err = new AIProviderError('provider down');
    expect(err).toBeInstanceOf(AIError);
    expect(err).toBeInstanceOf(AIProviderError);
    expect(err.statusCode).toBe(502);
  });

  it('AIModelUnavailableError is instanceof AIError (503)', () => {
    const err = new AIModelUnavailableError('llama3');
    expect(err).toBeInstanceOf(AIError);
    expect(err).toBeInstanceOf(AIModelUnavailableError);
    expect(err.statusCode).toBe(503);
    expect(err.message).toContain('llama3');
  });

  it('AIInvalidResponseError is instanceof AIError (502)', () => {
    const err = new AIInvalidResponseError('bad json');
    expect(err).toBeInstanceOf(AIError);
    expect(err).toBeInstanceOf(AIInvalidResponseError);
    expect(err.statusCode).toBe(502);
  });

  it('AITimeoutError is instanceof AIError (504)', () => {
    const err = new AITimeoutError('timed out');
    expect(err).toBeInstanceOf(AIError);
    expect(err).toBeInstanceOf(AITimeoutError);
    expect(err.statusCode).toBe(504);
  });

  it('AIInputError is instanceof AIError (400)', () => {
    const err = new AIInputError('empty prompt');
    expect(err).toBeInstanceOf(AIError);
    expect(err).toBeInstanceOf(AIInputError);
    expect(err.statusCode).toBe(400);
  });

  it('AIGenerationError is instanceof AIError (502)', () => {
    const err = new AIGenerationError('generation failed');
    expect(err).toBeInstanceOf(AIError);
    expect(err).toBeInstanceOf(AIGenerationError);
    expect(err.statusCode).toBe(502);
  });
});

describe('OllamaAIProvider — success', () => {
  it('returns a GenerationResponse with text and token counts', async () => {
    mockSuccessResponse();

    const provider = new OllamaAIProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3',
    });
    const result = await provider.generate({ prompt: 'What is 2+2?' });

    expect(result.text).toBe('The answer is 42.');
    expect(result.model).toBe('llama3');
    expect(result.promptTokens).toBe(10);
    expect(result.completionTokens).toBe(5);
    expect(result.totalTokens).toBe(15);
    expect(result.finishReason).toBe('stop');
  });

  it('sends the correct request body including stream:false', async () => {
    mockSuccessResponse();

    const provider = new OllamaAIProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3',
    });
    await provider.generate({ prompt: 'Hello' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:11434/api/generate');

    const body = JSON.parse(init?.body as string);
    expect(body.model).toBe('llama3');
    expect(body.prompt).toBe('Hello');
    expect(body.stream).toBe(false);
  });

  it('maps GenerationOptions to Ollama options fields', async () => {
    mockSuccessResponse();

    const provider = new OllamaAIProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3',
    });
    await provider.generate({
      prompt: 'Hello',
      options: { temperature: 0.7, maxTokens: 200, topP: 0.9, topK: 40 },
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
    expect(body.options.temperature).toBe(0.7);
    expect(body.options.num_predict).toBe(200);  // maxTokens → num_predict
    expect(body.options.top_p).toBe(0.9);
    expect(body.options.top_k).toBe(40);
  });

  it('handles response with undefined token counts gracefully', async () => {
    const body = makeOllamaResponse({
      prompt_eval_count: undefined as unknown as number,
      eval_count: undefined as unknown as number,
    });
    // Remove the keys entirely
    delete (body as Record<string, unknown>).prompt_eval_count;
    delete (body as Record<string, unknown>).eval_count;
    mockSuccessResponse(body);

    const provider = new OllamaAIProvider({ baseUrl: 'http://localhost:11434', model: 'llama3' });
    const result = await provider.generate({ prompt: 'Hello' });

    expect(result.promptTokens).toBeUndefined();
    expect(result.completionTokens).toBeUndefined();
    expect(result.totalTokens).toBeUndefined();
  });
});

// ===========================================================================
// 3. OllamaAIProvider — HTTP and response errors
// ===========================================================================

describe('OllamaAIProvider — HTTP errors', () => {
  it('throws AIModelUnavailableError on HTTP 404', async () => {
    mockHttpError(404, 'model not found');

    const provider = new OllamaAIProvider({ baseUrl: 'http://localhost:11434', model: 'unknown-model' });
    await expect(provider.generate({ prompt: 'Hello' })).rejects.toBeInstanceOf(
      AIModelUnavailableError
    );
  });

  it('throws AIGenerationError on other HTTP errors (e.g. 500)', async () => {
    mockHttpError(500, 'Internal Server Error');

    const provider = new OllamaAIProvider({ baseUrl: 'http://localhost:11434', model: 'llama3' });
    const err = await provider.generate({ prompt: 'Hello' }).catch(e => e);
    expect(err).toBeInstanceOf(AIGenerationError);
    expect(err.message).toContain('500');
  });

  it('throws AIInvalidResponseError when response body is not JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => { throw new SyntaxError('Unexpected token'); },
      text: async () => 'not-json',
    } as unknown as Response);

    const provider = new OllamaAIProvider({ baseUrl: 'http://localhost:11434', model: 'llama3' });
    await expect(provider.generate({ prompt: 'Hello' })).rejects.toBeInstanceOf(
      AIInvalidResponseError
    );
  });

  it('throws AIInvalidResponseError when `response` field is missing', async () => {
    const body = { model: 'llama3', done: true };
    mockSuccessResponse(body);

    const provider = new OllamaAIProvider({ baseUrl: 'http://localhost:11434', model: 'llama3' });
    await expect(provider.generate({ prompt: 'Hello' })).rejects.toBeInstanceOf(
      AIInvalidResponseError
    );
  });

  it('throws AIInvalidResponseError when `response` field is an empty string', async () => {
    mockSuccessResponse(makeOllamaResponse({ response: '   ' }));

    const provider = new OllamaAIProvider({ baseUrl: 'http://localhost:11434', model: 'llama3' });
    await expect(provider.generate({ prompt: 'Hello' })).rejects.toBeInstanceOf(
      AIInvalidResponseError
    );
  });
});

// ===========================================================================
// 4. OllamaAIProvider — connectivity failures
// ===========================================================================

describe('OllamaAIProvider — connectivity failures', () => {
  it('throws AIProviderError when fetch throws a network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const provider = new OllamaAIProvider({ baseUrl: 'http://localhost:11434', model: 'llama3' });
    const err = await provider.generate({ prompt: 'Hello' }).catch(e => e);
    expect(err).toBeInstanceOf(AIProviderError);
    expect(err.message).toContain('ECONNREFUSED');
  });

  it('throws AITimeoutError when fetch aborts due to timeout', async () => {
    const abortError = new Error('AbortError');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValueOnce(abortError);

    const provider = new OllamaAIProvider({
      baseUrl: 'http://localhost:11434',
      model: 'llama3',
      timeout: 1000,
    });
    const err = await provider.generate({ prompt: 'Hello' }).catch(e => e);
    expect(err).toBeInstanceOf(AITimeoutError);
    expect(err.message).toContain('timed out');
  });
});

// ===========================================================================
// 5. OllamaAIProvider — configuration accessors
// ===========================================================================

describe('OllamaAIProvider — configuration', () => {
  it('exposes model, baseUrl, and timeout via accessors', () => {
    const provider = new OllamaAIProvider({
      baseUrl: 'http://custom:11434',
      model: 'mistral',
      timeout: 5000,
    });

    expect(provider.getModel()).toBe('mistral');
    expect(provider.getBaseUrl()).toBe('http://custom:11434');
    expect(provider.getTimeout()).toBe(5000);
  });
});

// ===========================================================================
// 6. AIService — input validation
// ===========================================================================

describe('AIService — input validation', () => {
  let provider: AIProvider;

  beforeEach(() => {
    provider = {
      generate: jest.fn().mockResolvedValue({
        text: 'ok',
        model: 'llama3',
      } as GenerationResponse),
    };
  });

  it('throws AIInputError for an empty prompt', async () => {
    const service = new AIService(provider);
    await expect(service.generate({ prompt: '' })).rejects.toBeInstanceOf(AIInputError);
  });

  it('throws AIInputError for a whitespace-only prompt', async () => {
    const service = new AIService(provider);
    await expect(service.generate({ prompt: '   \t\n' })).rejects.toBeInstanceOf(AIInputError);
  });

  it('throws AIInputError when prompt exceeds maxPromptLength', async () => {
    const service = new AIService(provider, { maxPromptLength: 10 });
    const longPrompt = 'a'.repeat(11);
    await expect(service.generate({ prompt: longPrompt })).rejects.toBeInstanceOf(AIInputError);
    await expect(service.generate({ prompt: longPrompt })).rejects.toThrow(
      /exceeds maximum/
    );
  });

  it('throws AIInputError when prompt is not a string', async () => {
    const service = new AIService(provider);
    await expect(
      service.generate({ prompt: 42 as unknown as string })
    ).rejects.toBeInstanceOf(AIInputError);
  });
});

// ===========================================================================
// 7. AIService — successful delegation
// ===========================================================================

describe('AIService — successful generation', () => {
  it('delegates to the provider and returns the response', async () => {
    const expectedResponse: GenerationResponse = {
      text: 'Paris',
      model: 'llama3',
      promptTokens: 5,
      completionTokens: 2,
      totalTokens: 7,
    };

    const provider: AIProvider = {
      generate: jest.fn().mockResolvedValue(expectedResponse),
    };

    const service = new AIService(provider);
    const result = await service.generate({ prompt: 'What is the capital of France?' });

    expect(result).toEqual(expectedResponse);
    expect(provider.generate).toHaveBeenCalledTimes(1);
    expect((provider.generate as jest.Mock).mock.calls[0][0].prompt).toBe(
      'What is the capital of France?'
    );
  });

  it('passes GenerationOptions through to the provider', async () => {
    const provider: AIProvider = {
      generate: jest.fn().mockResolvedValue({ text: 'ok', model: 'llama3' }),
    };

    const service = new AIService(provider);
    const request: GenerationRequest = {
      prompt: 'Be creative',
      options: { temperature: 0.9, maxTokens: 500 },
    };

    await service.generate(request);
    expect((provider.generate as jest.Mock).mock.calls[0][0]).toEqual(request);
  });
});

// ===========================================================================
// 8. AIService — provider error propagation
// ===========================================================================

describe('AIService — provider error propagation', () => {
  it('propagates AIModelUnavailableError from the provider', async () => {
    const provider: AIProvider = {
      generate: jest.fn().mockRejectedValue(new AIModelUnavailableError('llama3')),
    };
    const service = new AIService(provider);
    await expect(service.generate({ prompt: 'Hello' })).rejects.toBeInstanceOf(
      AIModelUnavailableError
    );
  });

  it('propagates AITimeoutError from the provider', async () => {
    const provider: AIProvider = {
      generate: jest.fn().mockRejectedValue(new AITimeoutError('Request timeout')),
    };
    const service = new AIService(provider);
    await expect(service.generate({ prompt: 'Hello' })).rejects.toBeInstanceOf(AITimeoutError);
  });

  it('propagates AIProviderError from the provider', async () => {
    const provider: AIProvider = {
      generate: jest.fn().mockRejectedValue(new AIProviderError('Ollama down')),
    };
    const service = new AIService(provider);
    await expect(service.generate({ prompt: 'Hello' })).rejects.toBeInstanceOf(AIProviderError);
  });
});

// ===========================================================================
// 9. AIService — configuration accessors
// ===========================================================================

describe('AIService — configuration', () => {
  it('uses default configuration when none provided', () => {
    const provider: AIProvider = { generate: jest.fn() };
    const service = new AIService(provider);
    const cfg = service.getConfig();

    expect(cfg.timeoutMs).toBe(30_000);
    expect(cfg.maxPromptLength).toBe(16_384);
    expect(cfg.maxResponseLength).toBe(32_768);
  });

  it('merges custom configuration with defaults', () => {
    const provider: AIProvider = { generate: jest.fn() };
    const service = new AIService(provider, { maxPromptLength: 100 });
    const cfg = service.getConfig();

    expect(cfg.maxPromptLength).toBe(100);
    expect(cfg.timeoutMs).toBe(30_000); // default preserved
  });

  it('allows runtime config updates via updateConfig', () => {
    const provider: AIProvider = { generate: jest.fn() };
    const service = new AIService(provider);
    service.updateConfig({ maxPromptLength: 500 });

    expect(service.getConfig().maxPromptLength).toBe(500);
    expect(service.getConfig().timeoutMs).toBe(30_000); // unchanged
  });

  it('allows provider to be swapped at runtime via setProvider', async () => {
    const provider1: AIProvider = {
      generate: jest.fn().mockResolvedValue({ text: 'from p1', model: 'a' }),
    };
    const provider2: AIProvider = {
      generate: jest.fn().mockResolvedValue({ text: 'from p2', model: 'b' }),
    };

    const service = new AIService(provider1);
    expect((await service.generate({ prompt: 'Hello' })).text).toBe('from p1');

    service.setProvider(provider2);
    expect((await service.generate({ prompt: 'Hello' })).text).toBe('from p2');
    expect(service.getProvider()).toBe(provider2);
  });
});
