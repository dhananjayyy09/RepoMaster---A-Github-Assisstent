import { RagContext } from './rag.types';
import { RagGenerationError } from './rag.errors';

export class PromptBuilder {
  build(question: string, context: RagContext): string {
    try {
      if (!question || question.trim() === '') {
        throw new RagGenerationError('Question cannot be empty');
      }

      if (!context || !context.formattedContext) {
        throw new RagGenerationError('Context is required to build a prompt');
      }

      return `You are a knowledgeable programming assistant helping a developer understand a GitHub repository.

You will be provided with context from the codebase and a question.
Your task is to answer the question using ONLY the provided context.

Guidelines:
1. Base your answer entirely on the provided context.
2. If the context does not contain enough information to answer the question, clearly state that you do not have enough information in the repository context to answer. Do not guess or fabricate information.
3. Keep your answer concise, accurate, and helpful.
4. When referencing code, mention the file path or function names if applicable.
5. Provide code examples from the context if it helps clarify your answer.

--- REPOSITORY CONTEXT ---
${context.formattedContext}
--------------------------

Question:
${question}

Answer:`;
    } catch (error) {
      if (error instanceof RagGenerationError) {
        throw error;
      }
      throw new RagGenerationError(
        `Failed to build prompt: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
