import { config } from '../config';
import { OllamaAIProvider } from '../ai/ollama.ai.provider';
import { AIService } from '../ai/ai.service';
import {
  AIModelUnavailableError,
  AIProviderError,
  AITimeoutError,
} from '../ai/ai.errors';

function log(message: string): void {
  console.log(`[verify:ai] ${message}`);
}

function fail(message: string): never {
  console.error(`[verify:ai] FAILED: ${message}`);
  process.exit(1);
}

async function checkOllamaAvailability(): Promise<void> {
  const tagsUrl = `${config.ai.ollama.baseUrl}/api/tags`;
  log(`Checking Ollama availability at ${tagsUrl} ...`);

  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(tagsUrl, { signal: controller.signal });
    clearTimeout(timerId);
    if (!response.ok) {
      fail(`Ollama returned HTTP ${response.status} from /api/tags`);
    }
    log('Ollama is reachable.');
  } catch (error) {
    clearTimeout(timerId);
    if (error instanceof Error && error.name === 'AbortError') {
      fail('Ollama availability check timed out (5s)');
    }
    fail(
      `Cannot reach Ollama at ${config.ai.ollama.baseUrl}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

interface OllamaTagsResponse {
  models: Array<{ name: string }>;
}

async function checkGenerationModel(): Promise<void> {
  const model = config.ai.ollama.llmModel;
  const tagsUrl = `${config.ai.ollama.baseUrl}/api/tags`;
  log(`Checking generation model availability: ${model}`);

  const response = await fetch(tagsUrl);
  const data = (await response.json()) as OllamaTagsResponse;

  const models: string[] = (data.models ?? []).map((m: { name: string }) =>
    m.name.split(':')[0]
  );
  const modelBaseName = model.split(':')[0];

  if (!models.includes(modelBaseName)) {
    log(`WARNING: Model '${model}' not found in Ollama model list: [${models.join(', ')}]`);
    log(`Proceeding anyway — Ollama may still be able to serve the model.`);
  } else {
    log(`Generation model '${model}' is available.`);
  }
}

async function main(): Promise<void> {
  log('=== Milestone 7A — AI Generation Live Verification ===');
  log(`AI provider:       ${config.ai.provider}`);
  log(`Ollama base URL:   ${config.ai.ollama.baseUrl}`);
  log(`Generation model:  ${config.ai.ollama.llmModel}`);
  log(`Embedding model:   ${config.ai.ollama.embeddingModel} (separate — NOT used here)`);
  log(`Timeout:           ${config.ai.ollama.timeoutMs}ms`);
  log('');

  await checkOllamaAvailability();
  await checkGenerationModel();

  log('Creating OllamaAIProvider and AIService ...');
  const provider = new OllamaAIProvider({
    baseUrl: config.ai.ollama.baseUrl,
    model: config.ai.ollama.llmModel,
    timeout: config.ai.ollama.timeoutMs,
  });
  const service = new AIService(provider);

  log(`Provider: OllamaAIProvider (model=${provider.getModel()})`);
  log(`Service config: maxPromptLength=${service.getConfig().maxPromptLength}`);

  const prompt = 'What is 2 + 2? Answer in exactly one sentence.';
  log(`\nSending generation request:`);
  log(`  Prompt: "${prompt}"`);

  const start = Date.now();

  let response;
  try {
    response = await service.generate({ prompt });
  } catch (error) {
    if (error instanceof AIModelUnavailableError) {
      fail(
        `Generation model '${config.ai.ollama.llmModel}' is not available. ` +
        `Install it with: ollama pull ${config.ai.ollama.llmModel}`
      );
    }
    if (error instanceof AIProviderError) {
      fail(`Provider error: ${(error as Error).message}`);
    }
    if (error instanceof AITimeoutError) {
      fail(`Request timed out after ${config.ai.ollama.timeoutMs}ms`);
    }
    fail(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  }

  const elapsed = Date.now() - start;

  if (!response.text || response.text.trim() === '') {
    fail('Generation succeeded but returned empty text');
  }

  log(`\n=== Generation Successful ===`);
  log(`  Model:             ${response.model}`);
  log(`  Response:          "${response.text.trim()}"`);
  log(`  Prompt tokens:     ${response.promptTokens ?? 'N/A'}`);
  log(`  Completion tokens: ${response.completionTokens ?? 'N/A'}`);
  log(`  Total tokens:      ${response.totalTokens ?? 'N/A'}`);
  log(`  Finish reason:     ${response.finishReason ?? 'N/A'}`);
  log(`  Elapsed:           ${elapsed}ms`);

  log('\n=== Milestone 7A Live Verification: PASSED ===');
  log('No resources to clean up (stateless generation request).');
  process.exit(0);
}

main().catch((error) => {
  console.error('[verify:ai] Unhandled error:', error);
  process.exit(1);
});
