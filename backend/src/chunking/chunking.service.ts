import { ProcessedFile } from '../file-processing/file-processing.types';
import { CodeChunk, ChunkingConfig, ChunkingStrategy } from './chunking.types';
import { InvalidChunkInputError, ChunkingConfigurationError } from './chunking.errors';
import { config } from '../config/index';
import { LineBasedChunkingStrategy, CodeAwareChunkingStrategy, MarkdownChunkingStrategy } from './chunking.strategies';

export class ChunkingService {
  private strategies: ChunkingStrategy[];
  private defaultConfig: ChunkingConfig;

  constructor(customConfig?: Partial<ChunkingConfig>) {
    this.strategies = [
      new MarkdownChunkingStrategy(),
      new CodeAwareChunkingStrategy(),
      new LineBasedChunkingStrategy(), // Always last as fallback
    ];

    this.defaultConfig = {
      maxChunkLines: customConfig?.maxChunkLines ?? config.chunking.maxChunkLines,
      chunkOverlapLines: customConfig?.chunkOverlapLines ?? config.chunking.chunkOverlapLines,
    };

    this.validateConfig(this.defaultConfig);
  }

  chunkFile(file: ProcessedFile, customConfig?: Partial<ChunkingConfig>): CodeChunk[] {
    this.validateInput(file);

    const chunkingConfig = customConfig 
      ? { ...this.defaultConfig, ...customConfig }
      : this.defaultConfig;

    this.validateConfig(chunkingConfig);

    const strategy = this.selectStrategy(file.language);
    const chunks = strategy.chunk(file, chunkingConfig);

    if (chunks.length === 0) {
      throw new InvalidChunkInputError('No chunks generated from file');
    }

    return this.validateChunks(chunks);
  }

  chunkFiles(files: ProcessedFile[], customConfig?: Partial<ChunkingConfig>): CodeChunk[] {
    const allChunks: CodeChunk[] = [];

    for (const file of files) {
      try {
        const chunks = this.chunkFile(file, customConfig);
        allChunks.push(...chunks);
      } catch (error) {
        // Skip files that fail chunking, but continue processing others
        console.warn(`Failed to chunk file ${file.path}:`, error);
        continue;
      }
    }

    return allChunks;
  }

  private selectStrategy(language: string): ChunkingStrategy {
    for (const strategy of this.strategies) {
      if (strategy.canHandle(language)) {
        return strategy;
      }
    }
    // Should never reach here due to LineBasedChunkingStrategy
    return this.strategies[this.strategies.length - 1];
  }

  private validateInput(file: ProcessedFile): void {
    if (!file || !file.content || !file.path || !file.sha) {
      throw new InvalidChunkInputError('Invalid file input: missing required fields');
    }

    if (file.content.length === 0) {
      throw new InvalidChunkInputError('File content is empty');
    }

    if (file.content.length > 50_000_000) { // 50MB safety limit
      throw new InvalidChunkInputError('File content too large for chunking');
    }
  }

  private validateConfig(config: ChunkingConfig): void {
    if (config.maxChunkLines <= 0) {
      throw new ChunkingConfigurationError('maxChunkLines must be positive');
    }

    if (config.chunkOverlapLines < 0) {
      throw new ChunkingConfigurationError('chunkOverlapLines must be non-negative');
    }

    if (config.chunkOverlapLines >= config.maxChunkLines) {
      throw new ChunkingConfigurationError('chunkOverlapLines must be less than maxChunkLines');
    }
  }

  private validateChunks(chunks: CodeChunk[]): CodeChunk[] {
    const validatedChunks: CodeChunk[] = [];

    for (const chunk of chunks) {
      // Validate chunk structure
      if (!chunk.id || !chunk.content || !chunk.filePath || !chunk.fileSha) {
        console.warn(`Skipping invalid chunk: ${chunk.id || 'unknown'}`);
        continue;
      }

      // Validate chunk content
      if (chunk.content.trim().length === 0) {
        console.warn(`Skipping empty chunk: ${chunk.id}`);
        continue;
      }

      // Validate line numbers
      if (chunk.startLine <= 0 || chunk.endLine < chunk.startLine) {
        console.warn(`Skipping chunk with invalid line numbers: ${chunk.id}`);
        continue;
      }

      // Validate chunk index
      if (chunk.chunkIndex < 0 || chunk.totalChunks <= 0) {
        console.warn(`Skipping chunk with invalid index: ${chunk.id}`);
        continue;
      }

      validatedChunks.push(chunk);
    }

    if (validatedChunks.length === 0) {
      throw new InvalidChunkInputError('No valid chunks generated after validation');
    }

    return validatedChunks;
  }

  getAvailableStrategies(): string[] {
    return this.strategies.map(strategy => strategy.name);
  }

  getDefaultConfig(): ChunkingConfig {
    return { ...this.defaultConfig };
  }
}
