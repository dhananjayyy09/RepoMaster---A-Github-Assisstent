import { config } from '../config';
import { QdrantVectorService } from '../vector-store/qdrant.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import { OllamaEmbeddingProvider } from '../embeddings/ollama.provider';
import { AIService } from '../ai/ai.service';
import { OllamaAIProvider } from '../ai/ollama.ai.provider';
import { RetrievalService, ContextBuilder, PromptBuilder, RagService } from '../rag';

async function main() {
  console.log('--- Starting Manual RAG Verification ---');

  // Initialize Providers and Services
  const qdrantService = new QdrantVectorService({
    qdrantUrl: config.qdrant.url,
    collectionName: config.qdrant.collectionName,
    upsertBatchSize: config.qdrant.upsertBatchSize,
    timeoutMs: config.qdrant.timeoutMs,
  });
  const ollamaEmbedding = new OllamaEmbeddingProvider(config.ai.ollama);
  const embeddingService = new EmbeddingService(ollamaEmbedding);
  const ollamaAi = new OllamaAIProvider(config.ai.ollama);
  const aiService = new AIService(ollamaAi);

  const testConfig = { ...config.rag, similarityThreshold: 0.5 };
  const retrievalService = new RetrievalService(qdrantService, testConfig);
  const contextBuilder = new ContextBuilder(testConfig);
  const promptBuilder = new PromptBuilder();

  const ragService = new RagService(
    embeddingService,
    retrievalService,
    contextBuilder,
    promptBuilder,
    aiService,
    testConfig
  );

  const TEST_REPO_ID = 'test-rag-verification-repo-123';
  const MOCK_QUESTION = 'What is the purpose of the manual verification script?';

  try {
    console.log('1. Checking infrastructure health...');
    const qdrantHealth = await qdrantService.checkHealth();
    if (!qdrantHealth.available) {
      throw new Error('Qdrant is not available');
    }

    // Prepare a mock chunk to insert
    console.log('2. Inserting test chunk into Qdrant...');
    const testContent = `
/**
 * manual-rag-verification.ts
 * 
 * The purpose of this script is to verify the Retrieval-Augmented Generation (RAG) 
 * pipeline end-to-end. It inserts mock data, embeds a question, searches the vector database, 
 * builds context, and queries the AI model.
 */
    `.trim();

    const mockEmbedding = await embeddingService.embedText(testContent);

    await qdrantService.upsertVector({
      repositoryId: TEST_REPO_ID,
      repositoryFileId: 'test-file-123',
      repositoryOwner: 'test-owner',
      repositoryName: 'test-repo',
      chunk: {
        id: 'chunk-1',
        content: testContent,
        filePath: 'manual-rag-verification.ts',
        fileName: 'manual-rag-verification.ts',
        language: 'typescript',
        startLine: 1,
        endLine: 8,
        chunkIndex: 1,
        totalChunks: 1,
        fileSha: 'sha-mock',
        size: testContent.length,
        chunkType: 'CODE',
      },
      embedding: mockEmbedding,
    });
    console.log('   ✓ Test chunk inserted.');

    // Wait a brief moment to ensure Qdrant indexes the point
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log('\n3. Executing RAG Pipeline...');
    console.log(`   Question: "${MOCK_QUESTION}"`);
    console.log('   (This will perform embedding -> search -> context -> prompt -> generation)');

    const response = await ragService.askQuestion({
      repositoryId: TEST_REPO_ID,
      question: MOCK_QUESTION,
    });

    console.log('\n================ RAG RESPONSE ================');
    console.log(response.answer);
    console.log('\n================ SOURCES =====================');
    response.sources.forEach((s, idx) => {
      console.log(`[${idx + 1}] ${s.filePath} (Lines ${s.startLine}-${s.endLine}) - Score: ${s.score.toFixed(4)}`);
    });
    console.log('==============================================\n');

    if (response.sources.length === 0) {
      throw new Error('Verification failed: No sources were retrieved.');
    }

    console.log('✅ RAG Verification Completed Successfully!');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exitCode = 1;
  } finally {
    console.log('4. Cleaning up test data...');
    try {
      await qdrantService.deleteRepositoryVectors(TEST_REPO_ID);
      console.log('   ✓ Test data deleted.');
    } catch (cleanupError) {
      console.error('   ❌ Cleanup failed:', cleanupError);
    }
    
    // Explicitly exit since Ollama fetch/tsx might keep handles open
    process.exit(process.exitCode || 0);
  }
}

main();
