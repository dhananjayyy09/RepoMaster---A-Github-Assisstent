export interface GenerationRequest {
  prompt: string;
  options?: GenerationOptions;
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  [key: string]: unknown;
}

export interface GenerationResponse {
  text: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  finishReason?: string;
}

export interface GenerationConfig {
  timeoutMs: number;
  maxPromptLength: number;
  maxResponseLength: number;
}

export interface AIProvider {
  generate(request: GenerationRequest): Promise<GenerationResponse>;
}

export interface AIProviderConfig {
  baseUrl: string;
  model: string;
  timeout?: number;
  [key: string]: unknown;
}
