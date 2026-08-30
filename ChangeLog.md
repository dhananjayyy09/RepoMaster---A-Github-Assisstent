# ChangeLog

This file tracks all changes made to the GitHub Knowledge Assistant project by the AI assistant.

## [2026-08-31] Milestone 6B: End-to-End Indexing Pipeline

### Indexing Pipeline Implementation
- **File:** `backend/src/indexing/`
  - Created dedicated indexing module with types, errors, pipeline, factory, and index
  - Isolated indexing business logic from queue coordination
  - Clean separation of concerns for pipeline orchestration

### Indexing Types
- **File:** `backend/src/indexing/indexing.types.ts`
  - Added `IndexingPipelineResult` interface with files discovered, processed, chunks created, embeddings generated
  - Added `IndexingPipelineDependencies` interface for dependency injection
  - Defined clear boundaries between pipeline and external services

### Indexing Errors
- **File:** `backend/src/indexing/indexing.errors.ts`
  - Added `IndexingPipelineError` base class extending AppError
  - Error classification for retryable vs non-retryable failures
  - Fixed prototype chain for proper instanceof checks

### Indexing Pipeline
- **File:** `backend/src/indexing/indexing.pipeline.ts`
  - Implemented complete end-to-end repository indexing workflow
  - GitHub metadata retrieval → repository tree → file filtering → file download → normalization → chunking → embedding → Qdrant storage
  - Progress tracking through all stages with real counters
  - Re-indexing support with stale vector reconciliation
  - Empty file handling (recorded but not chunked/embedded)
  - Repository file upsert with idempotency
  - Atomic vector replacement (write new before delete old SHA)
  - Failure handling with repository status synchronization

### Indexing Factory
- **File:** `backend/src/indexing/indexing.factory.ts`
  - Created `createIndexingWorker()` function to wire real services into the pipeline
  - Connected existing FileFilterService, FileNormalizerService, ChunkingService, EmbeddingService, QdrantVectorService
  - Integrated with existing IndexingJobQueue and IndexingJobWorker from Milestone 6A
  - Proper dependency injection for all pipeline components

### Module Index
- **File:** `backend/src/indexing/index.ts`
  - Created barrel export for clean module imports
  - Exports types, errors, pipeline, and factory

### Testing
  - Added 5 comprehensive integration tests for indexing pipeline
  - Pipeline order test: GitHub → filter → download → normalize → chunk → embed → Qdrant
  - Counter consistency test: filesDiscovered >= filesProcessed, chunksCreated >= 0, embeddingsGenerated <= chunksCreated
  - Progress tracking test: real progress steps and counter updates
  - File filtering test: ignored files not downloaded
  - Truncated tree test: explicit failure without silent partial index
  - Queue validation test: payload/job mismatch detection
  - All tests use mocked dependencies, no live GitHub/Ollama/Qdrant required

### Manual Verification
- **File:** `backend/src/test/manual-indexing-verification.ts`
  - Created manual verification script for live end-to-end testing
  - Tests with real GitHub repository (octocat/Hello-World)
  - Validates Redis connection, PostgreSQL operations, GitHub API, Ollama embeddings, Qdrant storage
  - Successful completion: files=1, chunks=1, embeddings=1, collectionPoints=1
  - Proper resource cleanup: Redis disconnect, Prisma disconnect
  - Exit code 0 on success
  - Manual verification not part of automated test suite

### Bug Fixes
- **Issue:** Manual verification script hanging after successful completion
  - **Fix:** Added proper resource cleanup with `prisma.$disconnect()` and `redis.disconnect()`
- **Issue:** TypeScript error for undici import in manual verification
  - **Fix:** Removed unnecessary `node:undici` import, simplified cleanup

### Architecture Decisions
- Pipeline orchestration separated from queue coordination
- Worker coordinates job lifecycle, pipeline executes business logic
- Reuse of existing services (GitHub, file processing, chunking, embeddings, Qdrant)
- Incremental file processing to avoid memory issues
- Batch embedding and Qdrant operations for efficiency
- Deterministic vector IDs for idempotent re-indexing
- Write-new-before-delete-old strategy for safe vector updates
- Stale vector reconciliation after successful pipeline completion
- Repository status synchronized with job status throughout pipeline

### Integration Boundaries
- Indexing consumes GitHub service (Milestone 3B)
- Indexing consumes file processing (Milestone 4A)
- Indexing consumes chunking (Milestone 4B)
- Indexing consumes embeddings (Milestone 5A)
- Indexing consumes Qdrant vector storage (Milestone 5B)
- Indexing integrates with queue/worker (Milestone 6A)
- Indexing integrates with PostgreSQL job/repository services
- No API endpoints in this milestone (deferred to Milestone 8)

### Verification Results
- Focused indexing pipeline tests: 5/5 passed
- Full Jest test suite: 334/334 passed
- TypeScript type check: passed
- Production build: passed
- Manual indexing verification: passed (exit code 0)
- Database smoke test: skipped (PostgreSQL not running in test environment)
- Manual verification infrastructure services: skipped (Redis/Ollama/Qdrant not running in test environment)


## [2026-08-29] Milestone 6A: Background Indexing Foundation

### Queue Module
- **File:** `backend/src/queue/queue.types.ts`
  - Added application-level job IDs, repository IDs, payload, progress, result, retry, and Redis command-client types.
  - Reused Prisma JobStatus for persistent job-state typing.
- **File:** `backend/src/queue/queue.errors.ts`
  - Added queue, Redis-connection, invalid-payload, retry-exhausted, and handler errors with working instanceof behavior.
- **File:** `backend/src/queue/redis.client.ts`
  - Added one lazily connected official Redis client with connection lifecycle management and mapped command errors.
- **File:** `backend/src/queue/indexing-job.queue.ts`
  - Added enqueue, atomic pending-to-processing dequeue, acknowledgement, failure, retry, retry-attempt lookup, and membership-set duplicate prevention.
  - Stores only the indexing job ID and repository ID in queue payloads.
  - Rolls back the membership marker when the Redis pending-list write fails, so a failed enqueue does not permanently block a later retry.
- **File:** `backend/src/queue/indexing-job.worker.ts`
  - Added the injected-handler worker foundation for durable starts, successes, failures, and bounded retries.
  - Does not implement the Milestone 6B indexing handler.
- **File:** `backend/src/queue/index.ts`
  - Added the queue module barrel export.

### Existing Application Files
- **File:** `backend/src/services/indexingJob.service.ts`
  - Added create-and-enqueue, enqueue, retry preparation, and combined progress/statistics operations.
  - Validates 0–100 progress and non-negative integer counters.
- **File:** `backend/src/config/index.ts`
  - Added validated queue name, maximum retries, retry delay, and testable environment parsing.
- **File:** `.env.example`
  - Added documented queue and retry environment defaults.
- **File:** `backend/package.json`
  - Added the official redis dependency and the verify:redis-queue command.
- **File:** `backend/package-lock.json`
  - Recorded the resolved Redis package tree.

### Tests and Verification
- **File:** `backend/src/test/queue.test.ts`
  - Added mocked Redis configuration, connection-error, queue lifecycle, duplicate, retry, exhaustion, progress, and worker tests.
  - Added regression coverage for membership rollback after an enqueue write failure and for valid and invalid durable progress/counter persistence.
- **File:** `backend/src/test/manual-redis-queue-verification.ts`
  - Added isolated live Redis verification for connection, enqueue, processing, acknowledgement, retry, and cleanup.

### Verification Results
- Focused queue tests passed: 13 tests.
- Full backend Jest suite passed: 6 suites and 329 tests.
- TypeScript check, production build, PostgreSQL smoke test, and manual Redis queue verification passed.

### Known Limitations
- Retry delays are intentionally in-process and abandoned-processing recovery is deferred.
- The actual indexing pipeline is explicitly deferred to Milestone 6B.

## [2026-08-26] Milestone 5B: Qdrant Vector Storage

### Vector Store Module Structure
- **File:** `backend/src/vector-store/index.ts`
  - Created the vector-store barrel export for types, errors, utilities, the Qdrant client wrapper, and the storage service.
- **File:** `backend/src/vector-store/qdrant.client.ts`
  - Added QdrantClientWrapper for configurable client construction, URL handling, timeout configuration, and connectivity checks.
- **File:** `backend/src/vector-store/qdrant.service.ts`
  - Added QdrantVectorService for collection management, vector upserts, batch upserts, point deletion, filtered deletion, collection inspection, and health checks.
- **File:** `backend/src/vector-store/vector.types.ts`
  - Added application-level storage contracts for configuration, vector inputs/results, collection configuration, health results, and typed repository chunk payloads.
- **File:** `backend/src/vector-store/vector.errors.ts`
  - Added application-level errors for connection, collection, upsert, delete, payload, vector validation, health, and dimension failures.
- **File:** `backend/src/vector-store/vector.utils.ts`
  - Added deterministic point-ID generation, vector validation, payload validation, vector dimension measurement, and dimension consistency helpers.

### Qdrant Dependency and Configuration
- **File:** `backend/package.json`
  - Added the official @qdrant/js-client-rest dependency.
- **File:** `backend/package-lock.json`
  - Recorded the Qdrant client dependency and its resolved package metadata.
- **File:** `backend/src/config/index.ts`
  - Added QDRANT_COLLECTION_NAME with default repository_chunks.
  - Added QDRANT_UPSERT_BATCH_SIZE with default 100.
  - Added QDRANT_TIMEOUT_MS with default 30000.
  - Exposed the Qdrant URL, collection name, batch size, and timeout through the existing typed configuration object.
- **File:** `.env.example`
  - Added placeholder configuration for Qdrant collection name, upsert batch size, and timeout.
- **File:** `docker-compose.yml`
  - Reused the existing local Qdrant service; no replacement installation was added.

### Collection Management
- Added one configurable collection for repository chunks rather than one collection per repository
- Created collections using the actual EmbeddingResult.dimensions value and Cosine distance
- Reused existing collections only when their vector dimension and distance configuration was compatible
- Raised an application-level CollectionDimensionMismatchError for dimension conflicts without deleting or recreating stored data
- Added collection inspection for name, vector dimension, distance metric, point count, and health status
- Added single and batch vector upserts with configurable batch splitting
- Added single-point deletion and repository/file-filtered deletion using Qdrant filters

### Vector Storage and Payloads
- **File:** `backend/src/vector-store/vector.types.ts`
  - Added typed repository chunk payload metadata for repository, file, chunk, source, and ownership information
- **File:** `backend/src/vector-store/vector.utils.ts`
  - Added vector and payload validation before Qdrant writes
- Single upsert stores EmbeddingResult.vector and maps the related CodeChunk and repository identifiers into a Qdrant point
- Batch upsert validates dimensions, splits requests according to QDRANT_UPSERT_BATCH_SIZE, preserves metadata association, and returns the submitted point count
- Repeated upserts for the same repository and chunk identity update the same point
- Payload metadata includes repositoryId, repositoryFileId, filePath, fileName, extension, language, chunkIndex, totalChunks, chunkType, startLine, endLine, fileSha, repositoryOwner, repositoryName, and chunkSize

### Deterministic Point ID and SDK Compatibility Fixes
- **File:** `backend/src/vector-store/vector.utils.ts`
  - Replaced arbitrary deterministic base36 strings with UUID-compatible IDs derived from a SHA-256 hash of repositoryId:chunkId.
  - Mapped the installed SDK's top-level points_count collection field
  - Accepted the SDK's acknowledged delete status as a successful operation
  - Preserved safe Qdrant validation details in application-level upsert errors
  - The original live HTTP 400 was caused by Qdrant rejecting arbitrary string point IDs; the UUID-compatible representation resolved it.

### Testing
- **File:** `backend/src/test/vector-store.test.ts`
  - Added mocked tests for collection creation and reuse, dynamic dimensions, Cosine distance, dimension mismatch handling, deterministic IDs, vector and payload validation, single/batch upserts, deletion filters, health checks, and application-level Qdrant errors.
  - Added regression coverage for the invalid point-ID response and the SDK's top-level points_count and acknowledged response shapes.
- **File:** `backend/src/test/manual-qdrant-verification.ts`
  - Added a separate local-service verification script using live Ollama embeddings and dynamically detected dimensions.
  - Verifies Qdrant connectivity, collection setup, Cosine configuration, single upsert, repeat/idempotent upsert, batch upsert, point counts, single deletion, file-filtered deletion, repository-filtered deletion, and final collection health.
  - Uses an isolated test_ collection and removes temporary points without affecting unrelated collections.
  - Live verification passed with the current nomic-embed-text output dimension of 768.

### Architecture Decisions
- One configurable Qdrant collection stores repository chunks across repositories
- Collection dimensions are detected from actual embedding results rather than hardcoded
- UUID-compatible deterministic point IDs preserve idempotent updates
- Application-level types and errors isolate Qdrant SDK details from the rest of the system
- Filtered deletion avoids loading all matching points into application memory

### Integration Boundaries
- Vector storage consumes CodeChunk data from Milestone 4B and EmbeddingResult data from Milestone 5A
- Independent of Prisma, Redis jobs, background workers, search, semantic retrieval, RAG, chat, and frontend API endpoints
- No Prisma schema or migrations were modified
- Search, semantic retrieval, RAG, chat, and API integration remain deferred to later milestones

## [2026-08-24] Milestone 5A: Ollama Embedding Service

### Embedding Module Structure
- **File:** `backend/src/embeddings/`
  - Created dedicated embedding module with types, errors, service, provider, utils, and index
  - Isolated embedding logic from chunking and future vector storage
  - Clean separation of concerns for provider abstraction and embedding generation

### Embedding Types
- **File:** `backend/src/embeddings/embedding.types.ts`
  - Added `EmbeddingResult` interface with fields: vector, dimensions, model, inputLength
  - Added `EmbeddingConfig` interface with batchSize and timeoutMs
  - Added `EmbeddingProvider` interface for provider abstraction (embedText, embedBatch)
  - Added `ProviderConfig` interface for provider-specific configuration
  - Provider abstraction enables future support for OpenAI, Anthropic, etc.

### Embedding Errors
- **File:** `backend/src/embeddings/embedding.errors.ts`
  - Added `EmbeddingError` base class extending AppError
  - Added `EmbeddingProviderError` for provider operation failures
  - Added `EmbeddingModelUnavailableError` for missing/unavailable models
  - Added `EmbeddingInvalidResponseError` for malformed provider responses
  - Added `EmbeddingDimensionMismatchError` for inconsistent vector dimensions
  - Added `EmbeddingInputError` for invalid text input
  - Added `EmbeddingTimeoutError` for request timeouts
  - Fixed prototype chain for proper instanceof checks

### Embedding Utilities
- **File:** `backend/src/embeddings/embedding.utils.ts`
  - Added `validateEmbeddingInput()` for text validation (empty, whitespace, length)
  - Added `validateEmbeddingBatch()` for batch input validation
  - Added `validateVector()` for vector validation (array, non-empty, finite values)
  - Added `validateVectorDimensions()` for dimension consistency checking
  - Added `hasConsistentDimensions()` for dimension checking
  - Added `getVectorDimension()` for dimension measurement
  - Added `calculateInputLength()` for character count
  - Added `truncateText()` for text truncation for display/logging

### Ollama Embedding Provider
- **File:** `backend/src/embeddings/ollama.provider.ts`
  - Implemented `OllamaEmbeddingProvider` as EmbeddingProvider interface implementation
  - HTTP client with configurable timeout and base URL
  - Single text embedding via `/api/embed` endpoint
  - Batch embedding with native API and sequential fallback
  - Error handling for 404 (model unavailable), HTTP errors, timeouts
  - Response validation (embedding field, vector validation)
  - Maps Ollama responses to application-level EmbeddingResult
  - Timeout handling with AbortController
  - All Ollama HTTP communication isolated within provider

### Embedding Service
- **File:** `backend/src/embeddings/embedding.service.ts`
  - Implemented `EmbeddingService` as central orchestration layer
  - Provider-agnostic service using EmbeddingProvider abstraction
  - Input validation before delegating to provider
  - Batch processing with configurable chunk size
  - Large batch splitting for efficient processing
  - Dimension consistency validation across batch results
  - Configuration management (batchSize, timeoutMs)
  - Provider switching capability for testing/flexibility

### Environment Configuration
- **File:** `backend/src/config/index.ts`
  - Added `OLLAMA_TIMEOUT_MS` environment variable with default 30000 (30 seconds)
  - Added `EMBEDDING_BATCH_SIZE` environment variable with default 10
  - Integrated embedding configuration into existing validation system
  - Added `embedding.batchSize` to config object
  - Added `ai.ollama.timeoutMs` to config object

### Module Index
- **File:** `backend/src/embeddings/index.ts`
  - Created barrel export for clean module imports
  - Exports all types, errors, service, provider, and utilities

### Testing
- **File:** `backend/src/test/embedding.test.ts`
  - Added 30+ comprehensive unit tests for embedding module
  - Utility tests: input validation, vector validation, dimension checking
  - Error tests: all error types with proper instanceof checks
  - Provider tests: single embedding, batch embedding, error handling, timeout
  - Service tests: single embedding, batch embedding, dimension validation, chunking
  - All tests use mocked fetch, no live Ollama dependency
  - Tests cover success cases, error cases, edge cases, and fallback behavior

### .env.example Updates
- **File:** `.env.example`
  - Added `OLLAMA_TIMEOUT_MS=30000` with documentation
  - Added `EMBEDDING_BATCH_SIZE=10` with documentation
  - Added `MAX_FILE_SIZE_BYTES=1048576` (was missing)
  - Added `MAX_CHUNK_LINES=100` and `CHUNK_OVERLAP_LINES=10` (were missing)

### Architecture Decisions
- Provider abstraction pattern for embedding generation
- Ollama as initial provider with easy switch to cloud providers
- Deterministic dimension detection from actual embeddings (not hardcoded)
- Configurable batch size for efficient processing
- Timeout handling to prevent hanging requests
- Native batch API with sequential fallback for compatibility
- Clean separation: Service → Provider → Ollama API
- No external dependencies for HTTP (uses built-in fetch)
- Application-level types isolated from Ollama-specific responses

### Integration Boundaries
- Embedding consumes CodeChunk content from Milestone 4B
- Produces EmbeddingResult[] for future vector storage (Milestone 5B)
- Independent of Qdrant, PostgreSQL, Redis
- Clean separation from chunking and future vector storage
- No database operations in this milestone
- No Qdrant operations in this milestone

### Ollama Configuration
- Default model: nomic-embed-text
- Default endpoint: http://localhost:11434
- Default timeout: 30 seconds
- Default batch size: 10 texts
- Model must be manually installed/pulled (no automatic downloads)
- Clear error messages when model is unavailable

## [2026-08-23] Milestone 4B: Code Chunking & Metadata

### Chunking Module Structure
- **File:** `backend/src/chunking/`
  - Created dedicated chunking module with strategies, service, types, errors, utils, and index
  - Isolated chunking logic from file processing and future embedding
  - Clean separation of concerns for strategy selection, chunk generation, and metadata

### Chunking Types
- **File:** `backend/src/chunking/chunking.types.ts`
  - Added `ChunkType` type: CODE, FUNCTION, CLASS, METHOD, IMPORT, INTERFACE, TYPE, DOCUMENTATION, CONFIGURATION, FALLBACK
  - Added `CodeChunk` interface with fields: id, content, filePath, fileName, language, startLine, endLine, chunkIndex, totalChunks, fileSha, size, chunkType
  - Added `ChunkingConfig` interface: maxChunkLines, chunkOverlapLines
  - Added `ChunkingStrategy` interface for strategy pattern
  - Added `LineRange` and `CodeBlock` helper interfaces

### Chunking Errors
- **File:** `backend/src/chunking/chunking.errors.ts`
  - Added `ChunkingError` base class extending AppError
  - Added `InvalidChunkInputError` for invalid file inputs
  - Added `ChunkingConfigurationError` for configuration validation failures
  - Fixed prototype chain for proper instanceof checks

### Chunking Configuration
- **File:** `backend/src/config/index.ts`
  - Added `MAX_CHUNK_LINES` environment variable with default 100
  - Added `CHUNK_OVERLAP_LINES` environment variable with default 10
  - Integrated chunking configuration into existing validation system
  - Added `chunking.maxChunkLines` and `chunking.chunkOverlapLines` to config object 

### Chunking Utilities
- **File:** `backend/src/chunking/chunking.utils.ts`
  - Added `splitContentIntoLines()` for line splitting
  - Added `createLineRanges()` for creating overlapping line ranges
  - Added `extractLinesFromRange()` for extracting specific line ranges
  - Added `joinLines()` for joining lines back into content
  - Added `generateDeterministicChunkId()` for deterministic ID generation (no external dependencies)
  - Added `trimWhitespace()` for whitespace trimming
  - Added `validateChunkContent()` for content validation
  - Added `calculateChunkSize()` for UTF-8 aware size calculation
  - Added helper functions for indentation detection and content preservation

### Chunking Strategies
- **File:** `backend/src/chunking/chunking.strategies.ts`
  - Implemented `LineBasedChunkingStrategy` as fallback for all languages
  - Implemented `CodeAwareChunkingStrategy` for 16+ programming languages
  - Implemented `MarkdownChunkingStrategy` for Markdown files
  - Code-aware detection: imports, functions, classes, methods, interfaces, types
  - Markdown detection: headings, code blocks, sections
  - Automatic fallback to line-based when structural parsing unavailable
  - Configurable chunk size and overlap
  - Oversized structure splitting with line-aware fallback

### Chunking Service
- **File:** `backend/src/chunking/chunking.service.ts`
  - Implemented `ChunkingService` as central orchestration layer
  - Strategy selection based on file language
  - Input validation (file content, size, required fields)
  - Configuration validation (positive maxChunkLines, valid overlap)
  - Chunk validation (content, line numbers, indices)
  - Batch file processing with error handling
  - Deterministic chunk ID generation
  - Metadata preservation (path, filename, language, SHA, line numbers)

### Testing
- **File:** `backend/src/test/chunking.test.ts`
  - Added 50+ comprehensive unit tests for chunking
  - Utility tests: line splitting, range creation, ID generation, content validation
  - Strategy tests: line-based, code-aware, markdown
  - Service tests: chunking, validation, configuration, strategy selection
  - Metadata tests: path preservation, line numbers, chunk indices, SHA preservation
  - Edge case tests: long lines, whitespace, malformed code, mixed line endings
  - Determinism tests: same input produces same IDs
  - All tests use deterministic inputs, no external dependencies

### Module Index
- **File:** `backend/src/chunking/index.ts`
  - Created barrel export for clean module imports
  - Exports all types, errors, utilities, strategies, and service

### Architecture Decisions
- Layered strategy pattern: Markdown → Code-aware → Line-based fallback
- Code-aware chunking without full AST parsing (practical MVP approach)
- Deterministic chunk IDs based on file SHA, path, index, and configuration
- Line-aware chunking (never split mid-line)
- Configurable chunk size (100 lines default) and overlap (10 lines default)
- Metadata preservation for future semantic search
- Safe fallback for unknown languages and oversized structures
- No external dependencies for ID generation (simple hash function)

### Integration Boundaries
- Chunking consumes ProcessedFile objects from Milestone 4A
- Produces CodeChunk[] for future embedding stage (Milestone 5)
- Independent of GitHub API, Prisma, Qdrant, Ollama, Redis
- Clean separation from file processing and future embedding

## [2026-08-23] Milestone 4A: File Processing Foundation

### File Processing Module Structure
- **File:** `backend/src/file-processing/`
  - Created dedicated file-processing module with services, types, errors, utils, and index
  - Isolated file processing logic from GitHub integration and future chunking
  - Clean separation of concerns for filtering, language detection, and normalization

### File Processing Types
- **File:** `backend/src/file-processing/file-processing.types.ts`
  - Added `FileProcessStatus` type: PROCESSABLE, UNSUPPORTED, BINARY, TOO_LARGE
  - Added `ProgrammingLanguage` type with 25+ supported languages
  - Added `FileFilterResult` interface for structured filtering decisions
  - Added `ProcessedFile` interface for normalized file data
  - Added `FileProcessingConfig` interface for configurable filtering rules
  - Added `FileProcessingInput` interface for GitHub data consumption

### File Processing Errors
- **File:** `backend/src/file-processing/file-processing.errors.ts`
  - Added `FileProcessingError` base class extending AppError
  - Added `UnsupportedFileError` for unsupported file types
  - Added `BinaryFileError` for binary file detection
  - Added `FileTooLargeError` for size limit violations
  - Fixed prototype chain for proper instanceof checks

### File Filter Service
- **File:** `backend/src/file-processing/file-filter.service.ts`
  - Implemented `FileFilterService` with configurable filtering rules
  - Default max file size: 1MB (1048576 bytes)
  - Ignores 12 directory patterns: .git, node_modules, vendor, dist, build, out, target, coverage, .next, .nuxt, .cache, __pycache__
  - Ignores 40+ binary extensions: images, videos, audio, archives, executables, fonts, documents
  - Detects minified files: .min.js, .min.css, .bundle.js, .chunk.js
  - Returns structured `FileFilterResult` instead of throwing exceptions for normal filtering
  - Configurable via constructor or updateConfig method

### Language Detection Service
- **File:** `backend/src/file-processing/language-detector.service.ts`
  - Implemented `LanguageDetectorService` for deterministic language detection
  - Supports 25+ programming languages and file types
  - Extension-based detection with special filename support
  - Special files: Dockerfile, Makefile, Jenkinsfile, Procfile, package.json, requirements.txt, etc.
  - Case-insensitive filename matching
  - Returns 'Unknown' for unrecognized extensions

### File Processing Utilities
- **File:** `backend/src/file-processing/file-processing.utils.ts`
  - Added `detectBinaryContent()` for binary content detection
  - Added `normalizePath()` for consistent forward-slash paths
  - Added `extractFileName()` for filename extraction
  - Added `extractExtension()` for extension extraction
  - Added `isTextFile()` helper for text/binary classification
  - Binary detection: null bytes, high ratio of non-printable characters

### File Normalizer Service
- **File:** `backend/src/file-processing/file-normalizer.service.ts`
  - Implemented `FileNormalizerService` for end-to-end file processing
  - Combines filtering, language detection, and normalization
  - Accepts GitHub TreeItem and FileContent as input
  - Returns normalized `ProcessedFile` with consistent metadata
  - Throws exceptions for actual errors (binary, too large)
  - Silently skips unsupported files in batch processing
  - Path normalization for cross-platform consistency

### Environment Configuration
- **File:** `backend/src/config/index.ts`
  - Added `MAX_FILE_SIZE_BYTES` environment variable with default 1048576 (1MB)
  - Integrated file processing configuration into existing validation system
  - Added `fileProcessing.maxFileSizeBytes` to config object

### Testing
- **File:** `backend/src/test/file-processing.test.ts`
  - Added 80+ comprehensive unit tests for file processing
  - File filter tests: source files, directories, ignored patterns, binary detection, size limits
  - Language detection tests: 25+ languages, special files, case sensitivity, unknown extensions
  - Utility tests: binary detection, path normalization, filename/extension extraction
  - Normalizer tests: valid files, error cases, batch processing, path handling
  - All tests use deterministic inputs, no external API calls

### Module Index
- **File:** `backend/src/file-processing/index.ts`
  - Created barrel export for clean module imports
  - Exports all types, errors, services, and utilities

### Architecture Decisions
- Structured filtering decisions return results instead of exceptions
- File processing independent of GitHub API communication
- File processing independent of database operations
- Configurable filtering rules for future extensibility
- Conservative 1MB file size limit for source code processing
- Deterministic language detection vs ML-based approaches
- Binary detection via content heuristics, not just extensions

### Integration Boundaries
- File processing consumes GitHub application-level types (TreeItem, FileContent)
- Produces clean ProcessedFile for future chunking stage
- No database operations in this milestone
- No GitHub API calls in this milestone

## [2026-08-22] Milestone 3B: GitHub Repository Retrieval (with Improvements)

### Code Quality Improvements
- **File:** `backend/src/github/github.client.ts`
  - Added `GITHUB_API_VERSION` constant for single source of API version
  - Replaced hardcoded API version string with constant reference
- **File:** `backend/src/github/github.utils.ts`
  - Added `decodeBase64Content()` helper function for Base64 to UTF-8 decoding
  - Moved decoding logic from service to utils for better separation of concerns
- **File:** `backend/src/github/github.service.ts`
  - Updated to use `decodeBase64Content()` helper instead of inline decoding
  - Changed from dynamic import to direct import for URL parsing function
- **File:** `backend/src/test/github.test.ts`
  - Added 3 tests for `decodeBase64Content()` helper
  - Updated tests to use helper function
- **File:** `backend/src/test/manual-verification.ts`
  - Added test for Base64 decoding helper

### Repository Metadata Retrieval

### Repository Metadata Retrieval
- **File:** `backend/src/github/github.service.ts`
  - Implemented `getRepositoryMetadata(owner, repo)` method
  - Maps GitHub API response to clean application-level `RepositoryMetadata` type
  - Returns: owner, name, fullName, url, description, defaultBranch, stars, forks, primaryLanguage, size, dates, visibility, isArchived
  - Handles missing description and primary language gracefully
  - Maps 404 errors to `GitHubRepositoryNotFoundError`

### Repository Tree Retrieval
- **File:** `backend/src/github/github.service.ts`
  - Implemented `getRepositoryTree(owner, repo, sha?)` method
  - Uses GitHub Git Trees API with recursive=1 parameter
  - Maps GitHub tree items to clean application-level `TreeItem` type
  - Distinguishes between files (blob) and directories (tree)
  - Defaults to HEAD when no sha provided, supports explicit branch/ref
  - Throws `GitHubTreeTruncatedError` when GitHub returns truncated tree
  - Preserves path, type, sha, and size information

### File Content Retrieval
- **File:** `backend/src/github/github.service.ts`
  - Implemented `getFileContent(owner, repo, path, ref?)` method
  - Uses GitHub Contents API with optional ref parameter
  - Decodes Base64 content to UTF-8 string
  - Returns clean application-level `FileContent` type with path, content, sha, size, encoding
  - Validates that requested path is a file (not directory)
  - Throws `GitHubBinaryFileError` for directories and unsupported encodings
  - Maps 404 errors to `GitHubFileNotFoundError`

### Application-Level Types
- **File:** `backend/src/github/github.types.ts`
  - Added `RepositoryMetadata` interface for clean repository data
  - Added `TreeItem` interface for file/directory tree items
  - Added `FileContent` interface for decoded file content
  - Separated GitHub API response types from application-level types
  - Maintains boundary between external API structure and internal application

### Error Handling Mapping
- **File:** `backend/src/github/github.service.ts`
  - Mapped 404 repository errors to `GitHubRepositoryNotFoundError`
  - Mapped 404 file errors to `GitHubFileNotFoundError`
  - Mapped truncated trees to `GitHubTreeTruncatedError`
  - Mapped directory requests to `GitHubBinaryFileError`
  - Mapped unsupported encodings to `GitHubBinaryFileError`
  - Reused existing error architecture from Milestone 3A

### Rate-Limit Handling
- **File:** `backend/src/github/github.service.ts`
  - Reused existing rate-limit handling from GitHub client
  - GitHub client extracts X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers
  - Rate-limit errors map to `GitHubRateLimitError` with reset timestamp
  - No changes needed to client-level rate-limit implementation

### Testing
- **File:** `backend/src/test/github.test.ts`
  - Added 20 comprehensive tests for GitHub service methods
  - Repository metadata tests: successful retrieval, missing fields, 404, API failures
  - Repository tree tests: successful retrieval, default branch, explicit branch, truncated tree, errors
  - File content tests: successful retrieval, explicit ref, directory handling, encoding validation, errors
  - All tests use mocked responses, no live GitHub API calls
  - Total: 60 tests passing (40 from Milestone 3A + 17 new)

### Manual Verification
- **File:** `backend/src/test/manual-verification.ts`
  - Created manual verification script for real GitHub API testing
  - Successfully tested against https://github.com/facebook/react
  - Verified URL parsing, repository metadata, tree retrieval (7,842 items), file content retrieval
  - Confirmed Base64 decoding works correctly
  - Manual verification not part of automated test suite

### Database Boundary
- GitHub service remains independent of database operations
- No Prisma calls, no repository/file record creation
- Clean separation for future orchestration with file processing and chunking

### API Boundary
- No public API endpoints created in this milestone
- Service-level testing sufficient for current requirements
- API endpoints deferred to Milestone 8

## [2026-08-22] Milestone 3A: GitHub Integration Foundation

### GitHub Module Structure
- **File:** `backend/src/github/`
  - Created dedicated GitHub module with client, service, types, errors, utils, and index
  - Isolated external API communication from business logic

### GitHub HTTP Client
- **File:** `backend/src/github/github.client.ts`
  - Implemented reusable GitHub HTTP client with configurable base URL, timeout, and headers
  - Added User-Agent, GitHub API version, Accept, and optional Authorization headers
  - Implemented rate limit information extraction from response headers
  - Added proper error handling for non-2xx responses, timeouts, and rate limits

### GitHub Service Structure
- **File:** `backend/src/github/github.service.ts`
  - Created service structure/interface with placeholder methods for future implementation
  - Methods: validateRepositoryUrl, getRepositoryMetadata, getRepositoryTree, getFileContent

### GitHub Types
- **File:** `backend/src/github/github.types.ts`
  - Defined GitHub response types, rate limit information, repository URL structure
  - Added types for GitHub repository, tree items, file content, and error responses

### GitHub Error Architecture
- **File:** `backend/src/github/github.errors.ts`
  - Created GitHub-specific application errors extending AppError
  - Errors: GitHubInvalidUrlError, GitHubRepositoryNotFoundError, GitHubRateLimitError, GitHubApiError, GitHubFileNotFoundError, GitHubBinaryFileError, GitHubTreeTruncatedError
  - Fixed prototype chain issues for proper instanceof checks

### GitHub URL Parser/Validator
- **File:** `backend/src/github/github.utils.ts`
  - Implemented robust GitHub repository URL parser using URL API and Zod validation
  - Supports trailing slashes, .git suffix, query parameters, and URL fragments
  - Rejects non-GitHub URLs, malformed URLs, profile URLs, organization URLs, and specific page URLs (issues, pull requests, blob, tree, wiki, etc.)
  - Returns typed result with owner, repo, and normalized URL

### Environment Configuration
- **File:** `backend/src/config/index.ts`
  - Extended environment validation with GITHUB_API_URL and GITHUB_TOKEN
  - GITHUB_TOKEN remains optional, never committed to source control

### Testing Infrastructure
- **File:** `backend/package.json`
  - Added Jest testing framework and @types/jest
  - Added test script running Jest with ts-jest preset
  - Downgraded TypeScript from 7.0.2 to 5.7.2 for ts-jest compatibility

- **File:** `backend/jest.config.js`
  - Configured Jest with ts-jest preset, Node environment, and test patterns
  - Set up coverage collection and excluded database test from Jest runs

- **File:** `backend/src/test/setup.ts`
  - Created Jest setup file with global fetch mock

- **File:** `backend/src/test/github.test.ts`
  - Created comprehensive tests for GitHub URL parser (40 test cases)
  - Added tests for HTTP client (successful response, errors, timeout, rate limits, headers)
  - Tests use mocked responses without real GitHub API calls

- **File:** `backend/src/test/database.test.ts`
  - Converted existing database test from manual execution to Jest test suite
  - Maintained all database operations and relationship tests

### Bug Fixes
- **Issue:** TypeScript 7.0.2 incompatibility with ts-jest
  - **Fix:** Downgraded TypeScript to 5.7.2 for ts-jest compatibility
- **Issue:** GitHub error classes not properly recognized in instanceof checks
  - **Fix:** Added Object.setPrototypeOf calls in each GitHub error constructor
- **Issue:** HTTP client error handling not preserving custom error types
  - **Fix:** Added TypeError catch in URL parser and proper error propagation in client
- **Issue:** Test timeout not properly triggering abort signal
  - **Fix:** Updated timeout test to mock AbortError directly instead of relying on setTimeout

### Dependency Changes
- Added Jest 29.7.0, @types/jest 29.5.14, ts-jest 29.2.5 for testing infrastructure
- Downgraded TypeScript from 7.0.2 to 5.7.2 for ts-jest compatibility

## [2026-08-21] Milestone 2: Database & Core Models

### Database Schema and Migrations
- **File:** `backend/prisma/schema.prisma`
  - Added `User`, `Repository`, `RepositoryFile`, `IndexingJob`, `ChatSession`, and `Message` models.
  - Added status/role enums, foreign keys, cascade deletion, unique constraints, and indexes.
- **Files:** `backend/prisma/migrations/20260820184011_init/` and `backend/prisma/migrations/20260821190000_rename_running_job_status/`
  - Added and applied the initial PostgreSQL schema migration.
  - Added and applied a follow-up migration that renames `RUNNING` to `INDEXING`.
- **Files:** `.gitignore`, `backend/.gitignore`
  - Stopped ignoring Prisma migrations so schema history is version controlled.

### Backend Data Layer
- **File:** `backend/src/config/database.ts`
  - Added a shared Prisma Client with development-safe global caching.
- **Files:** `backend/src/repositories/`, `backend/src/services/`, and `backend/src/validators/`
  - Added data-access repositories, core CRUD services, and Zod boundary validation for all six models.
  - Added duplicate repository detection, relation-aware creates, and job-progress validation.
- **Files:** `backend/src/utils/errors.ts`, `backend/src/utils/databaseError.ts`
  - Added safe application-level mappings for Prisma conflicts, missing records, invalid references, and database failures.

### Verification
- **File:** `backend/src/test/database.test.ts`
  - Added a database smoke test covering CRUD operations and relationships across all core models.
  - Verified migration deployment, Prisma generation, schema validation, TypeScript compilation, and cleanup against local PostgreSQL.

## [2026-08-11] Milestone 1: Project Setup & Infrastructure

### Initial Project Structure
- Created monorepo structure with `frontend/`, `backend/`, `docker/` directories
- Removed duplicate Prisma directories (consolidated to single source of truth)

### Frontend Setup
- **File:** `frontend/package.json`
  - Installed Next.js 16.3.0, React 19.2.8, Tailwind CSS 4, TypeScript 5
  - Added scripts: dev, build, start, lint, type-check

- **File:** `frontend/app/page.tsx`
  - Created landing page with backend connection status
  - Added `'use client'` directive to fix React Server Component error
  - Implemented backend health check integration

- **File:** `frontend/lib/api.ts`
  - Created API client with health check function
  - Configured base URL from environment variables

- **File:** `frontend/next.config.ts`
  - Added environment variable configuration for API_URL and APP_NAME

### Backend Setup
- **File:** `backend/package.json`
  - Installed Express 5.2.1, TypeScript 7.0.2, Prisma 5.22.0
  - Added dependencies: cors, helmet, dotenv, zod, winston
  - Added dev dependencies: tsx, nodemon, @types packages
  - Added scripts: dev, build, start, type-check, prisma:generate, prisma:migrate, prisma:studio

- **File:** `backend/src/index.ts`
  - Created server entry point
  - Implemented server startup with port configuration

- **File:** `backend/src/app.ts`
  - Created Express app configuration
  - Implemented security middleware (helmet)
  - Configured CORS for frontend-backend communication
  - Added health check endpoint at `/api/health`
  - Implemented error handling middleware

- **File:** `backend/src/config/index.ts`
  - Created environment variable validation using Zod
  - Configured all required environment variables with defaults
  - Implemented type-safe configuration object

- **File:** `backend/src/middleware/errorHandler.ts`
  - Created error handling middleware
  - Implemented custom error classes in utils/errors.ts

- **File:** `backend/src/utils/errors.ts`
  - Created custom error classes: AppError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, InternalServerError

- **File:** `backend/tsconfig.json`
  - Configured TypeScript compilation settings
  - Fixed moduleResolution issue by removing deprecated option

### Infrastructure Setup
- **File:** `docker-compose.yml`
  - Configured PostgreSQL 16-alpine container
  - Configured Redis 7-alpine container
  - Configured Qdrant latest container
  - Added health checks for all services
  - Created persistent volumes for data storage
  - Configured network for service communication

- **File:** `backend/.env`
  - Created environment variables for development
  - Configured database, Redis, Qdrant connection strings
  - Set up AI provider configuration (Ollama)
  - Configured CORS and security settings

### Database Setup
- **File:** `backend/prisma/schema.prisma`
  - Created placeholder Prisma schema (models in Milestone 2)
  - Configured PostgreSQL datasource
  - Set up Prisma Client generator

### Documentation
- **File:** `README.md`
  - Created comprehensive project documentation
  - Added installation instructions
  - Documented Docker setup and Ollama configuration
  - Added troubleshooting section
  - Documented available scripts and commands

- **File:** `.env.example`
  - Created environment variable template
  - Documented all required configuration options

- **File:** `.gitignore`
  - Created git ignore rules for root directory
  - Added ignores for node_modules, .env files, build outputs

- **File:** `backend/.gitignore`
  - Created backend-specific git ignore rules

### Bug Fixes
- **Issue:** ts-node compatibility with Node.js v25
  - **Fix:** Switched to tsx for TypeScript execution
- **Issue:** TypeScript moduleResolution deprecated option
  - **Fix:** Removed `moduleResolution: "node"` from tsconfig.json
- **Issue:** Qdrant health check failing on Windows
  - **Fix:** Disabled health check (service still functional)
- **Issue:** Duplicate Prisma schemas
  - **Fix:** Consolidated to single source of truth at `backend/prisma/schema.prisma`
- **Issue:** Prisma 7.x breaking changes
  - **Fix:** Downgraded to stable Prisma 5.22.0
- **Issue:** React Server Component error with hooks
  - **Fix:** Added `'use client'` directive to frontend page.tsx

### Dependency Changes
- Installed tsx to replace ts-node for better Node.js v25 compatibility
- Downgraded Prisma from 7.x to 5.22.0 for stability and simpler configuration

### Documentation Setup
- **File:** `ChangeLog.md`
  - Created comprehensive change tracking document
  - Documented all changes made during Milestone 1
  - Added template for future change entries

- **File:** `Decisions.md`
  - Created technical decision documentation
  - Documented rationale behind architecture decisions
  - Explained technology stack choices
  - Added template for future decision documentation

- **File:** `Flow.md`
  - Created system flow documentation
  - Documented current application flows
  - Added planned future flows
  - Included debugging and performance flow guides
  - Added template for future flow documentation

---

## Template for Future Changes

### [Date] [Milestone/Feature Name]

#### Change Description
- **File:** `path/to/file`
  - Change details
  - Reason for change

#### Bug Fixes
- **Issue:** Description
  - **Fix:** Solution

#### Dependency Changes
- Added/Removed/Updated package (version) - reason
