import { EmbeddingService } from '../embeddings/embedding.service';
import { AIService } from '../ai/ai.service';
import { RetrievalService } from './retrieval.service';
import { ContextBuilder } from './context.builder';
import { PromptBuilder } from './prompt.builder';
import { RagRequest, RagResponse, RagConfig, SourceCitation } from './rag.types';
import { RagInputError, RagGenerationError } from './rag.errors';

export class RagService {
  constructor(
    private embeddingService: EmbeddingService,
    private retrievalService: RetrievalService,
    private contextBuilder: ContextBuilder,
    private promptBuilder: PromptBuilder,
    private aiService: AIService,
    private config: RagConfig
  ) {}

  async askQuestion(request: RagRequest): Promise<RagResponse> {
    try {
      this.validateRequest(request);

      // 1. Embed the question
      const queryEmbedding = await this.embeddingService.embedText(request.question);

      // 2. Retrieve relevant chunks
      const retrievedChunks = await this.retrievalService.search(
        queryEmbedding.vector,
        request.repositoryId
      );

      // 3. Handle insufficient context early (Empty retrieval)
      if (retrievedChunks.length === 0) {
        return {
          answer: "I couldn't find any relevant code or documentation in this repository to answer your question.",
          sources: [],
        };
      }

      // 4. Build context
      const context = this.contextBuilder.build(retrievedChunks);

      // 5. Build prompt
      const prompt = this.promptBuilder.build(request.question, context);

      // 6. Generate answer
      const aiResponse = await this.aiService.generate({ prompt });

      // 7. Format sources
      const sources: SourceCitation[] = context.chunks.map((chunk) => ({
        filePath: chunk.filePath,
        language: chunk.language,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        score: chunk.score,
      }));

      return {
        answer: aiResponse.text,
        sources,
      };
    } catch (error) {
      // Re-throw specific RAG errors
      if (
        error instanceof RagInputError ||
        error instanceof RagGenerationError ||
        (error instanceof Error && error.name.includes('Error'))
      ) {
        throw error;
      }
      
      throw new RagGenerationError(`RAG Pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateRequest(request: RagRequest): void {
    if (!request) {
      throw new RagInputError('Request cannot be null');
    }
    if (!request.repositoryId) {
      throw new RagInputError('Repository ID is required');
    }
    if (!request.question || request.question.trim() === '') {
      throw new RagInputError('Question cannot be empty');
    }
  }
}
