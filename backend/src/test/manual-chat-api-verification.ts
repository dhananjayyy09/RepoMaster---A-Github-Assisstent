import { spawn } from 'child_process';
import { config } from '../config';
import { QdrantVectorService } from '../vector-store/qdrant.service';
import { EmbeddingService } from '../embeddings/embedding.service';
import { OllamaEmbeddingProvider } from '../embeddings/ollama.provider';
import { repositoryService } from '../services/repository.service';
import { userService } from '../services/user.service';

const PORT = 3006;
const API_URL = `http://localhost:${PORT}/api`;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runChatApiVerification() {
  console.log('--- Starting Manual Chat & RAG API Verification (Milestone 8B) ---');

  // Initialize vector & embedding service for test data seeding
  const qdrantService = new QdrantVectorService({
    qdrantUrl: config.qdrant.url,
    apiKey: config.qdrant.apiKey,
    collectionName: config.qdrant.collectionName,
    upsertBatchSize: config.qdrant.upsertBatchSize,
    timeoutMs: config.qdrant.timeoutMs,
  });
  const ollamaEmbedding = new OllamaEmbeddingProvider(config.ai.ollama);
  const embeddingService = new EmbeddingService(ollamaEmbedding);

  let targetRepoId: string | null = null;
  let targetSessionId: string | null = null;

  console.log('\n1. Starting API server on port ' + PORT + '...');
  const server = spawn('npx', ['tsx', 'src/index.ts'], {
    env: { ...process.env, PORT: PORT.toString() },
    shell: true,
    stdio: 'inherit',
  });

  // Poll health endpoint until server is ready
  let serverReady = false;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`${API_URL}/health`);
      if (res.ok) {
        serverReady = true;
        break;
      }
    } catch {
      // Wait for server to bind port
    }
    await delay(1000);
  }

  if (!serverReady) {
    console.error('❌ Server failed to start in time');
    server.kill();
    process.exit(1);
  }

  try {
    console.log('\n2. Checking /api/health endpoint...');
    const healthRes = await fetch(`${API_URL}/health`);
    const healthData = (await healthRes.json()) as any;
    console.log('Health check:', healthData.status === 'ok' ? '✅ OK' : '❌ FAILED');

    console.log('\n3. Setting up test repository & Qdrant vector chunk...');
    const testUser = await userService.getOrCreateUser('verifier@repomaster.local');
    let repo: any;
    try {
      repo = await repositoryService.createRepository({
        userId: testUser.id,
        githubOwner: 'test-rag-org',
        githubRepo: 'test-chat-repo',
        githubUrl: 'https://github.com/test-rag-org/test-chat-repo',
      });
    } catch {
      const userRepos = await repositoryService.getRepositoriesByUser(testUser.id);
      repo = userRepos.find(
        (r) => r.githubOwner === 'test-rag-org' && r.githubRepo === 'test-chat-repo'
      );
    }

    if (!repo) {
      throw new Error('Failed to create or find test repository');
    }
    targetRepoId = repo.id;
    const currentRepoId = repo.id;
    console.log(`   Repository ready: ${repo.githubOwner}/${repo.githubRepo} (${currentRepoId})`);

    // Seed a vector chunk in Qdrant for this repository
    const seedContent = `
/**
 * Authentication Module
 * 
 * The system authenticates API clients using HMAC-SHA256 tokens.
 * Tokens expire after 3600 seconds and must be refreshed via POST /api/auth/refresh.
 */
    `.trim();

    const seedEmbedding = await embeddingService.embedText(seedContent);
    await qdrantService.upsertVector({
      repositoryId: currentRepoId,
      repositoryFileId: 'file-auth-test',
      repositoryOwner: repo.githubOwner,
      repositoryName: repo.githubRepo,
      chunk: {
        id: 'chunk-auth-1',
        content: seedContent,
        filePath: 'src/auth/token.ts',
        fileName: 'token.ts',
        language: 'typescript',
        startLine: 1,
        endLine: 8,
        chunkIndex: 1,
        totalChunks: 1,
        fileSha: 'sha-auth-1',
        size: seedContent.length,
        chunkType: 'CODE',
      },
      embedding: seedEmbedding,
    });
    console.log('   ✓ Test vector chunk indexed in Qdrant.');

    console.log('\n4. Testing POST /api/chat/sessions (create session)...');
    const sessionRes = await fetch(`${API_URL}/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repositoryId: currentRepoId,
        title: 'Authentication Inquiry',
      }),
    });
    const sessionData = (await sessionRes.json()) as any;
    if (sessionRes.status === 201 && sessionData.success === true && sessionData.data?.id) {
      targetSessionId = sessionData.data.id;
      console.log('Create chat session:', '✅ OK', `(Session ID: ${targetSessionId})`);
    } else {
      console.log('Create chat session:', '❌ FAILED');
      console.error(sessionData);
      throw new Error('Session creation failed');
    }

    console.log('\n5. Testing GET /api/chat/sessions/:sessionId (retrieve session)...');
    const getSessionRes = await fetch(`${API_URL}/chat/sessions/${targetSessionId}`);
    const getSessionData = (await getSessionRes.json()) as any;
    console.log(
      'Get chat session:',
      getSessionRes.status === 200 && getSessionData.data?.id === targetSessionId
        ? '✅ OK'
        : '❌ FAILED'
    );

    console.log('\n6. Testing GET /api/chat/repositories/:repositoryId/sessions (list sessions)...');
    const listSessionsRes = await fetch(
      `${API_URL}/chat/repositories/${targetRepoId}/sessions`
    );
    const listSessionsData = (await listSessionsRes.json()) as any;
    console.log(
      'List repository sessions:',
      listSessionsRes.status === 200 &&
        Array.isArray(listSessionsData.data) &&
        listSessionsData.data.length > 0
        ? '✅ OK'
        : '❌ FAILED'
    );

    console.log('\n7. Testing POST /api/chat/:sessionId/messages (RAG Question Answering)...');
    const question = 'How does the authentication module expire and refresh tokens?';
    console.log(`   Question: "${question}"`);

    const chatRes = await fetch(`${API_URL}/chat/${targetSessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    const chatData = (await chatRes.json()) as any;

    if (
      chatRes.status === 200 &&
      chatData.success === true &&
      chatData.data?.answer &&
      chatData.data?.sources?.length > 0
    ) {
      console.log('RAG Chat endpoint:', '✅ OK');
      console.log('\n--- Generated Answer ---');
      console.log(chatData.data.answer);
      console.log('\n--- Sources Returned ---');
      chatData.data.sources.forEach((s: any, idx: number) => {
        console.log(
          `[${idx + 1}] ${s.filePath} (Lines ${s.startLine}-${s.endLine}) - Score: ${s.score}`
        );
      });
      console.log('------------------------\n');
    } else {
      console.log('RAG Chat endpoint:', '❌ FAILED');
      console.error(chatData);
      throw new Error('RAG question answering failed');
    }

    console.log('8. Testing GET /api/chat/:sessionId/messages (chat history)...');
    const historyRes = await fetch(`${API_URL}/chat/${targetSessionId}/messages`);
    const historyData = (await historyRes.json()) as any;
    const hasBothMessages =
      Array.isArray(historyData.data) &&
      historyData.data.length >= 2 &&
      historyData.data[0].role === 'USER' &&
      historyData.data[1].role === 'ASSISTANT';
    console.log(
      'Chat history persistence:',
      historyRes.status === 200 && hasBothMessages ? '✅ OK' : '❌ FAILED'
    );

    console.log('\n9. Testing No-Context Behavior (unrelated question)...');
    const noContextRes = await fetch(`${API_URL}/chat/${targetSessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'What is the speed of an unladen swallow in ancient Rome?',
      }),
    });
    const noContextData = (await noContextRes.json()) as any;
    console.log(
      'No-context RAG response:',
      noContextRes.status === 200 &&
        noContextData.success === true &&
        noContextData.data.sources.length === 0
        ? '✅ OK'
        : '❌ FAILED'
    );

    console.log('\n10. Testing DELETE /api/chat/sessions/:sessionId (delete session)...');
    const deleteRes = await fetch(`${API_URL}/chat/sessions/${targetSessionId}`, {
      method: 'DELETE',
    });
    const deleteData = (await deleteRes.json()) as any;
    console.log(
      'Delete session:',
      deleteRes.status === 200 && deleteData.success === true ? '✅ OK' : '❌ FAILED'
    );

    console.log('\n✅ Milestone 8B Manual Chat & RAG API Verification Completed Successfully!');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exitCode = 1;
  } finally {
    console.log('\n11. Cleaning up test data & stopping server...');
    if (targetRepoId) {
      try {
        await qdrantService.deleteRepositoryVectors(targetRepoId);
        console.log('   ✓ Cleaned up Qdrant vectors');
      } catch (err) {
        console.error('   Error cleaning Qdrant vectors:', err);
      }
    }
    server.kill();
    process.exit(process.exitCode || 0);
  }
}

runChatApiVerification();
