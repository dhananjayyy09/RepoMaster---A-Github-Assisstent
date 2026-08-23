import { ProcessedFile } from '../file-processing/file-processing.types';

export type ChunkType =
  | 'CODE'
  | 'FUNCTION'
  | 'CLASS'
  | 'METHOD'
  | 'IMPORT'
  | 'INTERFACE'
  | 'TYPE'
  | 'DOCUMENTATION'
  | 'CONFIGURATION'
  | 'FALLBACK';

export interface CodeChunk {
  id: string;
  content: string;
  filePath: string;
  fileName: string;
  language: string;
  startLine: number;
  endLine: number;
  chunkIndex: number;
  totalChunks: number;
  fileSha: string;
  size: number;
  chunkType: ChunkType;
}

export interface ChunkingConfig {
  maxChunkLines: number;
  chunkOverlapLines: number;
}

export interface ChunkingStrategy {
  name: string;
  canHandle(language: string): boolean;
  chunk(file: ProcessedFile, config: ChunkingConfig): CodeChunk[];
}

export interface LineRange {
  startLine: number;
  endLine: number;
}

export interface CodeBlock {
  lines: string[];
  startLine: number;
  endLine: number;
  chunkType: ChunkType;
}
