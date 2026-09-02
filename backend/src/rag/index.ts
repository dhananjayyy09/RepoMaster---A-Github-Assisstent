import { config } from '../config';
import { QdrantVectorService } from '../vector-store/qdrant.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import { OllamaEmbeddingProvider } from '../embeddings/ollama.provider';
import { AIService } from '../ai/ai.service';
import { OllamaAIProvider } from '../ai/ollama.ai.provider';
import { RetrievalService } from './retrieval.service';
import { ContextBuilder } from './context.builder';
import { PromptBuilder } from './prompt.builder';
import { RagService } from './rag.service';

export * from './rag.types';
export * from './rag.errors';
export * from './retrieval.service';
export * from './context.builder';
export * from './prompt.builder';
export * from './rag.service';

// Default configured singleton
const qdrantService = new QdrantVectorService({
  qdrantUrl: config.qdrant.url,
  apiKey: config.qdrant.apiKey,
  collectionName: config.qdrant.collectionName,
  upsertBatchSize: config.qdrant.upsertBatchSize,
  timeoutMs: config.qdrant.timeoutMs,
});
const ollamaEmbedding = new OllamaEmbeddingProvider(config.ai.ollama);
const embeddingService = new EmbeddingService(ollamaEmbedding);
const ollamaAi = new OllamaAIProvider(config.ai.ollama);
const aiService = new AIService(ollamaAi);
const retrievalService = new RetrievalService(qdrantService, config.rag);
const contextBuilder = new ContextBuilder(config.rag);
const promptBuilder = new PromptBuilder();

export const ragService = new RagService(
  embeddingService,
  retrievalService,
  contextBuilder,
  promptBuilder,
  aiService,
  config.rag
);

