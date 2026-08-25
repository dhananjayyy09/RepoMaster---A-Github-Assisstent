import { EmbeddingService, OllamaEmbeddingProvider } from '../embeddings';
import { config } from '../config';
import { QdrantVectorService } from '../vector-store';
import type { EmbeddingResult } from '../embeddings';

const createMockChunk = (id: string) => ({
  id,
  content: 'console.log("Hello, world!");',
  filePath: '/src/index.ts',
  fileName: 'index.ts',
  language: 'TypeScript' as const,
  startLine: 1,
  endLine: 10,
  chunkIndex: 0,
  totalChunks: 1,
  fileSha: 'abc123def456',
  size: 100,
  chunkType: 'CODE' as const,
});

const createMockInput = (
  repositoryId: string,
  chunkId: string,
  embedding: EmbeddingResult,
  repositoryFileId = `file-${chunkId}`
) => ({
  repositoryId,
  repositoryFileId,
  repositoryOwner: 'test-owner',
  repositoryName: 'test-repo',
  chunk: createMockChunk(chunkId),
  embedding,
});

async function main() {
  console.log('=== Qdrant Manual Verification ===\n');

  const testCollectionName = `test_${config.qdrant.collectionName}`;
  const service = new QdrantVectorService({
    qdrantUrl: config.qdrant.url,
    collectionName: testCollectionName,
    upsertBatchSize: config.qdrant.upsertBatchSize,
    timeoutMs: config.qdrant.timeoutMs,
  });
  const testRepositoryId = 'test-repo-123';

  try {
    console.log('1. Checking Qdrant connectivity...');
    const health = await service.checkHealth();
    if (!health.available) {
      throw new Error(`Qdrant not available: ${health.error}`);
    }
    console.log('Qdrant is reachable\n');

    console.log('2. Generating live embeddings...');
    const embeddingService = new EmbeddingService(
      new OllamaEmbeddingProvider({
        baseUrl: config.ai.ollama.baseUrl,
        model: config.ai.ollama.embeddingModel,
        timeout: config.ai.ollama.timeoutMs,
      })
    );
    const singleEmbedding = await embeddingService.embedText('Qdrant vector storage verification');
    const batchEmbeddings = await embeddingService.embedBatch([
      'First Qdrant batch vector',
      'Second Qdrant batch vector',
      'Third Qdrant batch vector',
    ]);
    const testDimension = singleEmbedding.dimensions;
    console.log(`Live embedding dimension detected: ${testDimension}\n`);

    console.log('3. Creating/verifying collection...');
    await service.ensureCollection(testDimension);
    const collectionConfig = await service.getCollectionConfig();
    if (collectionConfig.vectorSize !== testDimension || collectionConfig.distanceMetric !== 'Cosine') {
      throw new Error(`Unexpected collection configuration: ${JSON.stringify(collectionConfig)}`);
    }
    console.log('Collection configuration verified:', collectionConfig);

    console.log('4. Upserting single vector...');
    const singleInput = createMockInput(testRepositoryId, 'chunk-1', singleEmbedding);
    const singleResult = await service.upsertVector(singleInput);
    if ((await service.getCollectionConfig()).vectorsCount !== 1) {
      throw new Error('Single upsert did not produce exactly one point');
    }
    console.log('Single vector upserted:', singleResult);

    console.log('5. Re-upserting same logical chunk...');
    const updateResult = await service.upsertVector(singleInput);
    if (updateResult.pointId !== singleResult.pointId || (await service.getCollectionConfig()).vectorsCount !== 1) {
      throw new Error('Repeat upsert was not idempotent');
    }
    console.log('Repeat upsert reused deterministic ID:', updateResult.pointId);

    console.log('6. Batch upserting vectors...');
    const batchResult = await service.upsertVectors([
      createMockInput(testRepositoryId, 'chunk-2', batchEmbeddings[0]),
      createMockInput(testRepositoryId, 'chunk-3', batchEmbeddings[1]),
      createMockInput(testRepositoryId, 'chunk-4', batchEmbeddings[2], 'file-target'),
    ]);
    if (batchResult.upsertedCount !== 3 || (await service.getCollectionConfig()).vectorsCount !== 4) {
      throw new Error('Batch upsert count did not match expected points');
    }
    console.log('Batch vectors upserted:', batchResult);

    console.log('7. Deleting single vector...');
    const singleDelete = await service.deleteVector(singleResult.pointId);
    if (singleDelete.deletedCount !== 1 || (await service.getCollectionConfig()).vectorsCount !== 3) {
      throw new Error('Single deletion did not remove one point');
    }
    console.log('Single vector deleted:', singleDelete);

    console.log('8. Deleting file vectors...');
    const fileDelete = await service.deleteFileVectors('file-target');
    if (fileDelete.deletedCount !== -1 || (await service.getCollectionConfig()).vectorsCount !== 2) {
      throw new Error('File-filtered deletion did not remove the target point');
    }
    console.log('File vectors deleted:', fileDelete);

    console.log('9. Deleting repository vectors...');
    const repositoryDelete = await service.deleteRepositoryVectors(testRepositoryId);
    if (repositoryDelete.deletedCount !== -1 || (await service.getCollectionConfig()).vectorsCount !== 0) {
      throw new Error('Repository-filtered deletion did not clean the test points');
    }
    console.log('Repository vectors deleted:', repositoryDelete);

    console.log('10. Verifying final collection health...');
    const finalHealth = await service.checkHealth();
    const finalConfig = await service.getCollectionConfig();
    if (!finalHealth.available || finalConfig.status !== 'green' || finalConfig.vectorsCount !== 0) {
      throw new Error(`Unexpected final state: ${JSON.stringify({ finalHealth, finalConfig })}`);
    }
    console.log('Collection remains healthy:', {
      vectorsCount: finalConfig.vectorsCount,
      status: finalConfig.status,
    });
    console.log('\n=== All Verification Tests Passed ===');
    console.log(`Test collection retained for reuse: ${testCollectionName}`);
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal verification error:', error);
  process.exit(1);
});
