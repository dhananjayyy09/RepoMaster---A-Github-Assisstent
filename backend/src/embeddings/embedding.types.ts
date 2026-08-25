export interface EmbeddingResult {
  vector: number[];
  dimensions: number;
  model: string;
  inputLength: number;
}

export interface EmbeddingConfig {
  batchSize: number;
  timeoutMs: number;
}

export interface EmbeddingProvider {
  embedText(text: string): Promise<EmbeddingResult>;

  embedBatch(texts: string[]): Promise<EmbeddingResult[]>;
}

export interface ProviderConfig {
  baseUrl: string;
  model: string;
  [key: string]: unknown;
}
