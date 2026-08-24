/**
 * Manual verification script for Ollama embedding integration.
 * This script tests the actual Ollama instance with live API calls.
 * 
 * IMPORTANT: This is NOT part of the automated test suite.
 * Run this manually only when Ollama is available and the model is installed.
 * 
 * Prerequisites:
 * 1. Ollama must be running at http://localhost:11434
 * 2. The embedding model must be installed (e.g., ollama pull nomic-embed-text)
 * 
 * Usage:
 * tsx src/test/manual-embedding-verification.ts
 */

import { OllamaEmbeddingProvider } from '../embeddings/ollama.provider';
import { EmbeddingService } from '../embeddings/embedding.service';

interface OllamaTagsResponse {
  models: Array<{
    name: string;
    modified_at: string;
    size: number;
  }>;
}

async function verifyOllamaEmbedding() {
  console.log('=== Ollama Embedding Manual Verification ===\n');

  // 1. Check if Ollama is reachable
  console.log('1. Checking Ollama availability...');
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    if (response.ok) {
      const data = await response.json() as OllamaTagsResponse;
      console.log('✓ Ollama is reachable');
      console.log(`  Available models: ${JSON.stringify(data.models, null, 2)}`);
    } else {
      console.log('✗ Ollama returned non-200 status');
      return;
    }
  } catch (error) {
    console.log('✗ Ollama is not reachable');
    console.log(`  Error: ${error instanceof Error ? error.message : 'unknown'}`);
    return;
  }

  // 2. Create provider and service
  console.log('\n2. Creating embedding provider and service...');
  const provider = new OllamaEmbeddingProvider({
    baseUrl: 'http://localhost:11434',
    model: 'nomic-embed-text',
    timeout: 30000,
  });

  const service = new EmbeddingService(provider, {
    batchSize: 10,
    timeoutMs: 30000,
  });

  console.log('✓ Provider and service created');
  console.log(`  Model: ${provider.getModel()}`);
  console.log(`  Base URL: ${provider.getBaseUrl()}`);

  // 3. Test single text embedding
  console.log('\n3. Testing single text embedding...');
  const testText = 'Hello, this is a test for embedding generation.';
  try {
    const result = await service.embedText(testText);
    console.log('✓ Single text embedding successful');
    console.log(`  Vector dimensions: ${result.dimensions}`);
    console.log(`  Input length: ${result.inputLength}`);
    console.log(`  Model: ${result.model}`);
    console.log(`  First 5 vector values: [${result.vector.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
    console.log(`  Last 5 vector values: [${result.vector.slice(-5).map(v => v.toFixed(4)).join(', ')}]`);
  } catch (error) {
    console.log('✗ Single text embedding failed');
    console.log(`  Error: ${error instanceof Error ? error.message : 'unknown'}`);
    if (error instanceof Error && error.message.includes('unavailable')) {
      console.log('  Hint: Run "ollama pull nomic-embed-text" to install the model');
    }
    return;
  }

  // 4. Test code chunk embedding
  console.log('\n4. Testing code chunk embedding...');
  const codeChunk = `function add(a, b) {
  return a + b;
}`;
  try {
    const result = await service.embedText(codeChunk);
    console.log('✓ Code chunk embedding successful');
    console.log(`  Vector dimensions: ${result.dimensions}`);
    console.log(`  Input length: ${result.inputLength}`);
    console.log(`  First 5 vector values: [${result.vector.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
    console.log(`  Last 5 vector values: [${result.vector.slice(-5).map(v => v.toFixed(4)).join(', ')}]`);
  } catch (error) {
    console.log('✗ Code chunk embedding failed');
    console.log(`  Error: ${error instanceof Error ? error.message : 'unknown'}`);
    return;
  }

  // 5. Test batch embedding
  console.log('\n5. Testing batch embedding...');
  const texts = [
    'First test text for batch embedding.',
    'Second test text for batch embedding.',
    'Third test text for batch embedding.',
  ];
  try {
    const results = await service.embedBatch(texts);
    console.log('✓ Batch embedding successful');
    console.log(`  Number of embeddings: ${results.length}`);
    console.log(`  All dimensions consistent: ${results.every(r => r.dimensions === results[0].dimensions)}`);
    console.log(`  Dimensions: ${results[0].dimensions}`);
    results.forEach((result, index) => {
      console.log(`  Text ${index + 1}: inputLength=${result.inputLength}, dimensions=${result.dimensions}`);
      console.log(`    First 3 values: [${result.vector.slice(0, 3).map(v => v.toFixed(4)).join(', ')}]`);
    });
  } catch (error) {
    console.log('✗ Batch embedding failed');
    console.log(`  Error: ${error instanceof Error ? error.message : 'unknown'}`);
    return;
  }

  console.log('\n=== All verification tests passed ===');
}

// Run verification
verifyOllamaEmbedding().catch(error => {
  console.error('Verification failed with unexpected error:', error);
  process.exit(1);
});
