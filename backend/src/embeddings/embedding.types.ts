/**
 * Application-level embedding types and interfaces.
 * These types are independent of any specific embedding provider implementation.
 */

/**
 * Result of a single embedding operation.
 * Contains the vector and metadata about the embedding.
 */
export interface EmbeddingResult {
  /** The embedding vector as an array of numbers */
  vector: number[];
  /** Number of dimensions in the vector */
  dimensions: number;
  /** Model name used to generate the embedding */
  model: string;
  /** Length of the input text that was embedded */
  inputLength: number;
}

/**
 * Configuration for embedding operations.
 */
export interface EmbeddingConfig {
  /** Maximum number of texts to process in a single batch */
  batchSize: number;
  /** Timeout in milliseconds for embedding requests */
  timeoutMs: number;
}

/**
 * Provider abstraction for embedding generation.
 * Different providers (Ollama, OpenAI, etc.) implement this interface.
 */
export interface EmbeddingProvider {
  /**
   * Generate an embedding for a single text.
   * @param text - The text to embed
   * @returns Promise resolving to an EmbeddingResult
   * @throws EmbeddingError if the operation fails
   */
  embedText(text: string): Promise<EmbeddingResult>;

  /**
   * Generate embeddings for multiple texts in a batch.
   * @param texts - Array of texts to embed
   * @returns Promise resolving to an array of EmbeddingResults
   * @throws EmbeddingError if the operation fails
   */
  embedBatch(texts: string[]): Promise<EmbeddingResult[]>;
}

/**
 * Provider-specific configuration.
 * Each provider can have its own configuration requirements.
 */
export interface ProviderConfig {
  /** Base URL for the provider API */
  baseUrl: string;
  /** Model name to use for embeddings */
  model: string;
  /** Additional provider-specific options */
  [key: string]: unknown;
}
