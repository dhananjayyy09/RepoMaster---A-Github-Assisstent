export interface RagConfig {
  maxRetrievedChunks: number;
  similarityThreshold: number;
  maxContextChunks: number;
}

export interface RagRequest {
  repositoryId: string;
  question: string;
}

export interface RetrievedChunk {
  id: string;
  score: number;
  filePath: string;
  fileName: string;
  language: string;
  content: string; // The text content of the chunk
  startLine: number;
  endLine: number;
  fileSha: string;
}

export interface SourceCitation {
  filePath: string;
  language: string;
  startLine: number;
  endLine: number;
  score: number;
}

export interface RagContext {
  chunks: RetrievedChunk[];
  formattedContext: string;
}

export interface RagResponse {
  answer: string;
  sources: SourceCitation[];
}
