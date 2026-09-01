import { RagConfig, RagContext, RetrievedChunk } from './rag.types';
import { RagContextError } from './rag.errors';

export class ContextBuilder {
  constructor(private config: RagConfig) {}

  build(chunks: RetrievedChunk[]): RagContext {
    try {
      if (!chunks || chunks.length === 0) {
        return {
          chunks: [],
          formattedContext: '',
        };
      }

      // Deduplicate chunks (by ID) and sort by descending score
      const uniqueChunksMap = new Map<string, RetrievedChunk>();
      for (const chunk of chunks) {
        if (!uniqueChunksMap.has(chunk.id)) {
          uniqueChunksMap.set(chunk.id, chunk);
        }
      }

      let sortedChunks = Array.from(uniqueChunksMap.values()).sort(
        (a, b) => b.score - a.score
      );

      // Enforce the context limits
      if (this.config.maxContextChunks > 0) {
        sortedChunks = sortedChunks.slice(0, this.config.maxContextChunks);
      }

      // Re-sort chunks by file path and then line number for natural reading flow
      const orderedForContext = [...sortedChunks].sort((a, b) => {
        if (a.filePath !== b.filePath) {
          return a.filePath.localeCompare(b.filePath);
        }
        return a.startLine - b.startLine;
      });

      const formattedContext = orderedForContext
        .map((chunk) => {
          return `---
File: ${chunk.filePath}
Lines: ${chunk.startLine}-${chunk.endLine}
Language: ${chunk.language}
Content:
${chunk.content}
---`;
        })
        .join('\n\n');

      return {
        chunks: sortedChunks, // Keep originally selected sorted (by score) chunks
        formattedContext,
      };
    } catch (error) {
      throw new RagContextError(
        `Failed to build context: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
