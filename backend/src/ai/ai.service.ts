import type {
  AIProvider,
  GenerationRequest,
  GenerationResponse,
  GenerationConfig,
} from './ai.types';
import { AIInputError } from './ai.errors';

const DEFAULT_CONFIG: GenerationConfig = {
  timeoutMs: 30_000,
  maxPromptLength: 16_384,
  maxResponseLength: 32_768,
};

export class AIService {
  private provider: AIProvider;
  private config: GenerationConfig;

  constructor(
    provider: AIProvider,
    serviceConfig?: Partial<GenerationConfig>
  ) {
    this.provider = provider;
    this.config = {
      ...DEFAULT_CONFIG,
      ...serviceConfig,
    };
  }

  async generate(request: GenerationRequest): Promise<GenerationResponse> {
    this.validateRequest(request);
    return this.provider.generate(request);
  }

  private validateRequest(request: GenerationRequest): void {
    if (typeof request.prompt !== 'string') {
      throw new AIInputError('Prompt must be a string');
    }

    if (request.prompt.trim() === '') {
      throw new AIInputError('Prompt must not be empty or whitespace');
    }

    if (request.prompt.length > this.config.maxPromptLength) {
      throw new AIInputError(
        `Prompt length (${request.prompt.length}) exceeds maximum allowed length (${this.config.maxPromptLength})`
      );
    }
  }

  getProvider(): AIProvider {
    return this.provider;
  }

  setProvider(provider: AIProvider): void {
    this.provider = provider;
  }

  getConfig(): GenerationConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<GenerationConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}
