import { QdrantVectorService } from '../vector-store/qdrant.service';
import { RagConfig, RetrievedChunk } from './rag.types';
import { RagRetrievalError } from './rag.errors';

export class RetrievalService {
  constructor(
    private qdrantService: QdrantVectorService,
    private config: RagConfig
  ) {}

  async search(vector: number[], repositoryId: string): Promise<RetrievedChunk[]> {
    try {
      if (!repositoryId) {
        throw new RagRetrievalError('Repository ID is required for retrieval');
      }

      if (!vector || vector.length === 0) {
        throw new RagRetrievalError('Valid query vector is required for retrieval');
      }

      const results = await this.qdrantService.searchVectors({
        vector,
        repositoryId,
        limit: this.config.maxRetrievedChunks,
        scoreThreshold: this.config.similarityThreshold,
      });

      return results.map((result) => {
        const p = result.payload;
        
        // Ensure required metadata exists
        if (!p.filePath || !p.language || p.startLine === undefined || p.endLine === undefined || !p.fileSha) {
           throw new RagRetrievalError(`Retrieved chunk ${result.pointId} is missing required payload metadata`);
        }
        
        return {
          id: result.pointId,
          score: result.score,
          filePath: p.filePath,
          fileName: p.fileName,
          language: p.language,
          content: (p.content as string) || '', // Extract content from payload (assumed to be stored in Qdrant)
          startLine: p.startLine,
          endLine: p.endLine,
          fileSha: p.fileSha,
        };
      });
    } catch (error) {
      if (error instanceof RagRetrievalError) {
        throw error;
      }
      throw new RagRetrievalError(`Retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
