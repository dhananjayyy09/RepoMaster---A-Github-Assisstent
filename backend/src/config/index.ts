import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  
  // Qdrant
  QDRANT_URL: z.string().url().default('http://localhost:6333'),
  QDRANT_API_KEY: z.string().optional(),
  
  // GitHub
  GITHUB_API_URL: z.string().url().default('https://api.github.com'),
  GITHUB_TOKEN: z.string().optional(),
  
  // AI Provider
  AI_PROVIDER: z.enum(['ollama', 'openai', 'anthropic']).default('ollama'),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_EMBEDDING_MODEL: z.string().default('nomic-embed-text'),
  OLLAMA_LLM_MODEL: z.string().default('llama3'),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  
  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  
  // Security
  JWT_SECRET: z.string().min(32).optional(),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  
  // File Processing
  MAX_FILE_SIZE_BYTES: z.string().default('1048576'), // 1MB default
  
  // Chunking
  MAX_CHUNK_LINES: z.string().default('100'), // 100 lines per chunk
  CHUNK_OVERLAP_LINES: z.string().default('10'), // 10 lines overlap
  
  // Embedding
  OLLAMA_TIMEOUT_MS: z.string().default('30000'), // 30 seconds default
  EMBEDDING_BATCH_SIZE: z.string().default('10'), // 10 texts per batch
});

const env = envSchema.parse(process.env);

export const config = {
  env: env.NODE_ENV,
  port: parseInt(env.PORT, 10),
  
  database: {
    url: env.DATABASE_URL,
  },
  
  redis: {
    url: env.REDIS_URL,
  },
  
  qdrant: {
    url: env.QDRANT_URL,
    apiKey: env.QDRANT_API_KEY,
  },
  
  github: {
    apiUrl: env.GITHUB_API_URL,
    token: env.GITHUB_TOKEN,
  },
  
  ai: {
    provider: env.AI_PROVIDER,
    ollama: {
      baseUrl: env.OLLAMA_BASE_URL,
      embeddingModel: env.OLLAMA_EMBEDDING_MODEL,
      llmModel: env.OLLAMA_LLM_MODEL,
      timeoutMs: parseInt(env.OLLAMA_TIMEOUT_MS, 10),
    },
    openai: {
      apiKey: env.OPENAI_API_KEY,
    },
    anthropic: {
      apiKey: env.ANTHROPIC_API_KEY,
    },
  },
  
  cors: {
    origin: env.CORS_ORIGIN,
  },
  
  security: {
    jwtSecret: env.JWT_SECRET,
    rateLimitWindowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    rateLimitMaxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
  },
  
  fileProcessing: {
    maxFileSizeBytes: parseInt(env.MAX_FILE_SIZE_BYTES, 10),
  },
  
  chunking: {
    maxChunkLines: parseInt(env.MAX_CHUNK_LINES, 10),
    chunkOverlapLines: parseInt(env.CHUNK_OVERLAP_LINES, 10),
  },
  
  embedding: {
    batchSize: parseInt(env.EMBEDDING_BATCH_SIZE, 10),
  },
};

export type Config = typeof config;
