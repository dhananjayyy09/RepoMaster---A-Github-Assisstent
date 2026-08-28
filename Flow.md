# Flow

This file documents the flow and interactions between different parts of the GitHub Knowledge Assistant codebase.

## Current System Flow (Milestones 1–4B)

### Frontend Application Flow

```
User Access
    ↓
Next.js App Router
    ↓
page.tsx (Client Component)
    ↓
useEffect Hook triggers on mount
    ↓
apiClient.healthCheck()
    ↓
Fetch Request to Backend
    ↓
Backend Response
    ↓
Update UI State (backendStatus, healthData)
    ↓
Render Status Indicators
```

### Backend Application Flow

```
Server Start (src/index.ts)
    ↓
Load Environment Variables (dotenv)
    ↓
Validate Configuration (Zod schema)
    ↓
Create Express App (src/app.ts)
    ↓
Apply Middleware
    ├── Helmet (Security headers)
    ├── CORS (Cross-origin handling)
    ├── express.json() (Body parsing)
    └── express.urlencoded() (URL encoding)
    ↓
Register Routes
    └── GET /api/health
    ↓
Apply Error Handler Middleware
    ↓
Start HTTP Server on configured port
    ↓
Listen for Requests
```

### Health Check Flow

```
Client Request: GET /api/health
    ↓
Express Router matches route
    ↓
Health Check Handler executes
    ↓
Return JSON Response:
{
  "status": "ok",
  "service": "github-knowledge-assistant-api",
  "timestamp": "ISO timestamp",
  "environment": "development/production"
}
    ↓
Response sent to client
```

### Error Handling Flow

```
Error Occurs in Route Handler
    ↓
Express Error Handler Middleware (src/middleware/errorHandler.ts)
    ↓
Check if Error is AppError instance
    ├── Yes: Use error status code and message
    └── No: Treat as Internal Server Error
    ↓
Return JSON Response:
{
  "error": {
    "message": "Error description",
    "statusCode": 400/404/500/etc
  }
}
    ↓
Log error to console
```

### Environment Configuration Flow

```
Application Start
    ↓
dotenv loads .env file
    ↓
Zod Schema Validation (src/config/index.ts)
    ├── Validate NODE_ENV
    ├── Validate PORT
    ├── Validate DATABASE_URL
    ├── Validate REDIS_URL
    ├── Validate QDRANT_URL
    ├── Validate AI Provider settings
    ├── Validate CORS settings
    └── Validate Security settings
    ↓
If Validation Fails:
    └── Throw detailed error with missing/invalid fields
    ↓
If Validation Succeeds:
    └── Export typed config object
    ↓
Config used throughout application
```

### Core Data Layer Flow

The core data layer is not exposed as a public API yet. It is used by the database smoke test and is ready for future controllers.

```
Caller (test or future controller)
    ↓
Service (`src/services/`)
    ├── Validate external input with Zod
    ├── Apply small domain rules
    │   ├── Reject duplicate repositories for a user
    │   └── Require job progress from 0 to 100
    ↓
Repository (`src/repositories/`)
    ↓
Shared Prisma Client (`src/config/database.ts`)
    ↓
PostgreSQL
    ├── User
    ├── Repository
    │   ├── RepositoryFile
    │   ├── IndexingJob
    │   └── ChatSession → Message
    ↓
Return typed Prisma model to caller
```

### GitHub URL Parsing Flow

```
User Input (GitHub repository URL)
    ↓
parseGitHubRepositoryUrl() in github.utils.ts
    ↓
Create URL object from input string
    ↓
Validate hostname is 'github.com'
    ↓
Extract and normalize pathname
    ↓
Split path into components
    ↓
Validate structure (owner/repo format)
    ↓
Remove .git suffix if present
    ↓
Check for invalid URL patterns (issues, pull, blob, tree, etc.)
    ↓
Zod schema validation
    ↓
Return typed result: { owner, repo, url }
    ↓
Or throw GitHubInvalidUrlError
```

### GitHub HTTP Client Flow

```
Service calls GitHub Client (get/post)
    ↓
Build request headers
    ├── User-Agent header
    ├── Accept header (application/vnd.github.v3+json)
    ├── X-GitHub-Api-Version header (from GITHUB_API_VERSION)
    └── Authorization header (if token provided)
    ↓
fetchWithTimeout with AbortController
    ↓
Fetch request to GitHub API
    ↓
Extract rate limit headers from response
    ├── X-RateLimit-Limit
    ├── X-RateLimit-Remaining
    └── X-RateLimit-Reset
    ↓
Check response status
    ├── 2xx: Parse JSON and return data with rate limit info
    ├── 403: Throw GitHubRateLimitError with reset time
    └── Other errors: Throw GitHubApiError with status and message
    ↓
Return GitHubResponse<T> with data and rateLimitInfo
```

### GitHub Error Flow

```
GitHub API error occurs
    ↓
GitHub Client catches error
    ↓
Check error type
    ├── 403 status → GitHubRateLimitError
    ├── 404 status → GitHubApiError; the service maps it to a repository- or file-specific error
    ├── Other non-2xx → GitHubApiError
    └── Network/timeout → GitHubApiError
    ↓
Error includes rate limit information if available
    ↓
Service layer handles error
    ↓
Return appropriate error response to client
```

### Repository Metadata Retrieval Flow

```
User/Caller requests repository metadata
    ↓
GitHubService.getRepositoryMetadata(owner, repo)
    ↓
GitHubClient.get('/repos/{owner}/{repo}')
    ↓
GitHub API returns repository data
    ↓
Map GitHubRepository to RepositoryMetadata
    ├── owner.login → owner
    ├── name → name
    ├── full_name → fullName
    ├── Construct URL → url
    ├── description → description
    ├── default_branch → defaultBranch
    ├── stargazers_count → stars
    ├── forks_count → forks
    ├── language → primaryLanguage
    ├── size → size
    ├── created_at → createdAt (Date)
    ├── updated_at → updatedAt (Date)
    ├── pushed_at → pushedAt (Date)
    ├── visibility → visibility
    └── isArchived → false (not in basic response)
    ↓
Return RepositoryMetadata to caller
    ↓
Error handling:
    ├── 404 → GitHubRepositoryNotFoundError
    └── Other errors → GitHubApiError
```

### Repository Tree Retrieval Flow

```
User/Caller requests repository tree
    ↓
GitHubService.getRepositoryTree(owner, repo, sha?)
    ↓
Default to 'HEAD' if no sha provided
    ↓
GitHubClient.get('/repos/{owner}/{repo}/git/trees/{sha}?recursive=1')
    ↓
GitHub API returns tree data
    ↓
Check if tree is truncated
    ├── Yes → Throw GitHubTreeTruncatedError
    └── No → Continue
    ↓
Map GitHubTreeItem to TreeItem
    ├── path → path
    ├── type 'blob' → 'file'
    ├── type 'tree' → 'directory'
    ├── sha → sha
    └── size → size (if available)
    ↓
Return TreeItem[] to caller
    ↓
Error handling:
    ├── 404 → GitHubRepositoryNotFoundError
    ├── Truncated → GitHubTreeTruncatedError
    └── Other errors → GitHubApiError
```

### File Content Retrieval Flow

```
User/Caller requests file content
    ↓
GitHubService.getFileContent(owner, repo, path, ref?)
    ↓
GitHubClient.get('/repos/{owner}/{repo}/contents/{path}?ref={ref}')
    ↓
GitHub API returns file data
    ↓
Validate file type
    ├── type !== 'file' → Throw GitHubBinaryFileError
    └── type === 'file' → Continue
    ↓
Validate encoding
    ├── encoding !== 'base64' → Throw GitHubBinaryFileError
    └── encoding === 'base64' → Continue
    ↓
decodeBase64Content() in github.utils.ts decodes Base64 content to UTF-8
    ↓
Map GitHubFileContent to FileContent
    ├── path → path
    ├── decoded content → content
    ├── sha → sha
    ├── size → size
    └── encoding → encoding
    ↓
Return FileContent to caller
    ↓
Error handling:
    ├── 404 → GitHubFileNotFoundError
    ├── Directory → GitHubBinaryFileError
    ├── Unsupported encoding → GitHubBinaryFileError
    └── Other errors → GitHubApiError
```

### File Processing Flow (Milestone 4A)

```
GitHub TreeItem (from Milestone 3B)
    ↓
File Filter Service
    ├── Check if directory → UNSUPPORTED
    ├── Check ignored directories (.git, node_modules, etc.) → UNSUPPORTED
    ├── Check file size vs MAX_FILE_SIZE_BYTES → TOO_LARGE if exceeded
    ├── Check ignored extensions (.png, .exe, etc.) → BINARY
    ├── Check minified patterns (.min.js, etc.) → UNSUPPORTED
    └── Return FileFilterResult with status
    ↓
If status is PROCESSABLE:
    ↓
Language Detector Service
    ├── Extract filename from path
    ├── Check special filenames (Dockerfile, Makefile, etc.)
    ├── Extract extension
    ├── Map to ProgrammingLanguage via extension lookup
    └── Return language (or 'Unknown')
    ↓
Binary Detection (via utils)
    ├── Check for null bytes in content
    ├── Check ratio of non-printable characters
    └── Return true if binary detected
    ↓
File Normalizer Service
    ├── Apply file filter
    ├── Detect language
    ├── Detect binary content
    ├── Normalize path (forward slashes)
    ├── Extract filename and extension
    ├── Create ProcessedFile with metadata
    └── Return ProcessedFile or throw error (BinaryFileError, FileTooLargeError)
    ↓
ProcessedFile
    ├── path (normalized)
    ├── fileName
    ├── extension
    ├── language
    ├── content
    ├── size
    ├── sha
    └── isProcessable
    ↓
 Milestone 4B: Chunking
```

### File Filter Decision Flow

```
TreeItem input
    ↓
Is it a directory?
    ├── Yes → UNSUPPORTED (skip)
    └── No → Continue
    ↓
Is it in ignored directory?
    ├── Yes → UNSUPPORTED (skip)
    └── No → Continue
    ↓
Does size exceed MAX_FILE_SIZE_BYTES?
    ├── Yes → TOO_LARGE (skip)
    └── No → Continue
    ↓
Is extension in ignored list?
    ├── Yes → BINARY (skip)
    └── No → Continue
    ↓
Is filename minified pattern?
    ├── Yes → UNSUPPORTED (skip)
    └── No → PROCESSABLE (accept)
```

### Language Detection Flow

```
Filename input
    ↓
Normalize to lowercase
    ↓
Exact match in special filenames?
    ├── Yes (Dockerfile, Makefile, etc.) → Return specific language
    └── No → Continue
    ↓
Extract extension
    ↓
Extension in language map?
    ├── Yes → Return mapped language
    └── No → Return 'Unknown'
```

### Binary Detection Flow

```
Content string input
    ↓
Contains null bytes (\0)?
    ├── Yes → Binary detected
    └── No → Continue
    ↓
Calculate non-printable character ratio
    ↓
Ratio > 30%?
    ├── Yes → Binary detected
    └── No → Text content
```

### File Normalization Flow

```
TreeItem + FileContent input
    ↓
Apply File Filter
    ├── UNSUPPORTED → Skip file
    ├── TOO_LARGE → Throw FileTooLargeError
    ├── BINARY → Throw BinaryFileError
    └── PROCESSABLE → Continue
    ↓
Detect Language
    ↓
Detect Binary Content
    ├── Binary detected → Throw BinaryFileError
    └── Text content → Continue
    ↓
Normalize Path (forward slashes)
    ↓
Extract Filename
    ↓
Extract Extension
    ↓
Create ProcessedFile
    ├── path: normalized path
    ├── fileName: extracted filename
    ├── extension: extracted extension
    ├── language: detected language
    ├── content: file content
    ├── size: file size
    ├── sha: file SHA
    └── isProcessable: true
    ↓
Return ProcessedFile
```

### Batch File Processing Flow

```
Array of TreeItems + Array of FileContents
    ↓
Create map of FileContents by path
    ↓
Iterate through TreeItems
    ↓
Skip directories
    ↓
Find matching FileContent by path
    ├── Not found → Skip
    └── Found → Continue
    ↓
Normalize file
    ├── Success → Add to results
    └── Error (binary, too large) → Skip
    ↓
Return array of ProcessedFiles
```

### Embedding Flow (Milestone 5A)

```
CodeChunk (from Milestone 4B)
    ↓
EmbeddingService.embedText() or embedBatch()
    ↓
Input Validation
    ├── Check text not empty
    ├── Check text not whitespace-only
    ├── Check text length < 100k characters
    └─ Invalid → Throw EmbeddingInputError
    ↓
Batch Size Check
    ├── Small batch (≤ batchSize) → Send directly to provider
    └─ Large batch → Split into chunks
    ↓
EmbeddingProvider.embedBatch()
    ↓
OllamaEmbeddingProvider
    ├── Try native batch API (/api/embed with input array)
    ├── If batch API fails → Sequential fallback
    └─ Individual embedText() calls
    ↓
Ollama HTTP Request
    ├── POST to {baseUrl}/api/embed
    ├── Request body: { model, input }
    ├── Timeout handling with AbortController
    └─ Response: { embeddings: number[][] }
    ↓
Response Validation
    ├── Check embeddings field exists
    ├── Check embeddings is an array
    ├── Check each vector is not empty
    ├── Check all values are finite numbers
    └─ Invalid → Throw EmbeddingInvalidResponseError
    ↓
Create EmbeddingResult
    ├── vector: number[]
    ├── dimensions: vector.length
    ├── model: configured model name
    └─ inputLength: text.length
    ↓
Dimension Consistency Check (batch only)
    ├── Check all embeddings have same dimensions
    └─ Mismatch → Throw EmbeddingDimensionMismatchError
    ↓
Return EmbeddingResult[]
```

### Vector Storage Flow (Milestone 5B)

```
CodeChunk
    ↓
EmbeddingService
    ↓
EmbeddingResult
    ↓
QdrantVectorService
    ↓
Ensure collection from embedding dimensions
    ↓
Generate deterministic UUID point ID
    ↓
Build typed metadata payload
    ↓
Qdrant collection
    ↓
Stored vector + payload
```

The vector-store input carries the repository ID, repository-file ID, repository owner/name, the `CodeChunk`, and its `EmbeddingResult`. The service stores the embedding vector as the Qdrant vector and stores source metadata as the payload.

### Collection Initialization Flow

```
EmbeddingResult.dimensions
    ↓
QdrantVectorService.ensureCollection()
    ↓
Check configured collection
    ├── Missing → Create with dynamic size and Cosine distance
    └── Exists → Read vector configuration
                    ↓
          Verify size and distance
                    ├── Compatible → Reuse
                    └── Mismatch → CollectionDimensionMismatchError
```

The service never recreates an existing collection when dimensions differ.

### Vector Upsert and Deletion Flow

```
Single or batch EmbeddingResult input
    ↓
Validate vector values and collection dimension
    ↓
Generate deterministic UUID point ID(s)
    ↓
Build repository/file/chunk metadata payload
    ↓
Upsert point(s) with vector and payload
    ↓
Return application-level storage result
```

```
Delete point, repository, or file
    ↓
Qdrant point ID or payload filter
    ↓
Qdrant delete operation
    ↓
Return deletion result
```

Repository deletion filters on `repositoryId`; file deletion filters on `repositoryFileId`. Filtered deletion returns an acknowledged result with an unknown exact count, while single-point deletion reports one deleted point when Qdrant acknowledges the operation.

### Vector Store Error Flow

```
Qdrant operation fails
    ↓
QdrantVectorService maps SDK failure
    ├── Dimension conflict → CollectionDimensionMismatchError
    ├── Invalid vector/payload → VectorValidationError or VectorPayloadError
    ├── Collection failure → QdrantCollectionError
    ├── Upsert failure → QdrantUpsertError
    └── Delete failure → QdrantDeleteError
    ↓
Application-level error returned to caller
```

### Single Text Embedding Flow

```
Text input
    ↓
EmbeddingService.embedText()
    ↓
Validate input (not empty, not whitespace, length OK)
    ↓
Delegate to EmbeddingProvider.embedText()
    ↓
OllamaEmbeddingProvider builds request
    ├── URL: {baseUrl}/api/embed
    ├── Body: { model, input }
    └─ Headers: Content-Type: application/json
    ↓
Fetch with timeout (AbortController)
    ↓
Ollama processes request
    ↓
Response validation
    ├── Check status code (404 → model unavailable)
    ├── Parse JSON response
    ├── Validate embeddings field and first vector
    └─ Validate vector values
    ↓
Create EmbeddingResult
    ↓
Return to caller
```

### Batch Embedding Flow

```
Text[] input
    ↓
EmbeddingService.embedBatch()
    ↓
Validate batch (not empty, all texts valid)
    ↓
Check batch size vs configured batchSize
    ↓
If small batch:
    Send directly to provider
    ↓
If large batch:
    Split into chunks of batchSize
    Process each chunk sequentially
    Combine results
    ↓
Validate dimension consistency across all results
    ↓
Return EmbeddingResult[]
```

### Ollama Provider Error Flow

```
Ollama API error occurs
    ↓
Provider catches error
    ↓
Check error type
    ├── 404 status → EmbeddingModelUnavailableError
    ├── Timeout → EmbeddingTimeoutError
    ├── Invalid response → EmbeddingInvalidResponseError
    ├── Network error → EmbeddingProviderError
    └─ Other → EmbeddingProviderError
    ↓
Error includes model name and status when applicable
    ↓
Service layer handles error
    ↓
Return appropriate error response to caller
```

### Chunking Flow (Milestone 4B)

```
ProcessedFile (from Milestone 4A)
    ↓
ChunkingService.chunkFile()
    ↓
Input Validation
    ├── Check required fields (path, content, sha)
    ├── Check content not empty
    ├── Check content size < 50MB
    └─ Invalid → Throw InvalidChunkInputError
    ↓
Configuration Validation
    ├── Check maxChunkLines > 0
    ├── Check chunkOverlapLines >= 0
    ├── Check chunkOverlapLines < maxChunkLines
    └─ Invalid → Throw ChunkingConfigurationError
    ↓
Strategy Selection
    ├── Is language Markdown? → MarkdownChunkingStrategy
    ├── Is language code? → CodeAwareChunkingStrategy
    └─ Default → LineBasedChunkingStrategy
    ↓
Strategy.chunk()
    ↓
MarkdownChunkingStrategy
    ├── Detect headings (#, ##, ###)
    ├── Detect code blocks (```)
    ├── Create blocks by heading/code boundaries
    ├── Split oversized blocks with line ranges
    └─ Return CodeChunk[]
    ↓
CodeAwareChunkingStrategy
    ├── Detect import/include blocks
    ├── Detect function boundaries
    ├── Detect class/interface boundaries
    ├── Detect method boundaries
    ├── Create blocks by structural boundaries
    ├── Split oversized blocks with line ranges
    └─ Return CodeChunk[]
    ↓
LineBasedChunkingStrategy
    ├── Split content into lines
    ├── Create overlapping line ranges
    ├── Extract lines for each range
    └─ Return CodeChunk[]
    ↓
Chunk Validation
    ├── Check chunk structure (id, content, path, sha)
    ├── Check content not empty
    ├── Check line numbers valid
    ├── Check chunk index valid
    └─ Skip invalid chunks
    ↓
Metadata Creation
    ├── Generate deterministic chunk ID
    ├── Set filePath, fileName, language
    ├── Set startLine, endLine (1-based)
    ├── Set chunkIndex, totalChunks
    ├── Set fileSha
    ├── Calculate chunk size
    └─ Set chunkType
    ↓
Return CodeChunk[]
```

### Milestone 5B Storage Handoff

```
File Processing Service (Milestone 4A - COMPLETED)
    ↓
ProcessedFile
    ↓
Chunking Service (Milestone 4B - COMPLETED)
    ├── Text splitting
    ├── Overlap management
    └── Metadata preservation
    ↓
CodeChunk[]
    ↓
Embedding Service (Milestone 5A - COMPLETED)
    ├── Vector generation
    └── Model selection
    ↓
EmbeddingResult[]
    ↓
Qdrant Storage (Milestone 5B - COMPLETED)
    ├── Vector insertion
    └── Metadata indexing
```

### Database Error Flow

```
Prisma operation fails
    ↓
Repository catches error
    ↓
`handleDatabaseError()` maps known Prisma codes
    ├── Unique constraint → ConflictError (409)
    ├── Missing record → NotFoundError (404)
    ├── Invalid reference/input → ValidationError (400)
    └── Other database failure → DatabaseError (500)
    ↓
Express error middleware returns the safe application error
```

### Deletion Flow

```
Delete User
    ↓ cascade
Delete owned Repositories and ChatSessions
    ↓ cascade from Repository
Delete RepositoryFiles, IndexingJobs, and Repository ChatSessions
    ↓ cascade from ChatSession
Delete Messages
```

---

## Planned System Flow (Future Milestones)

### Repository Import Flow (Milestone 3+)

```
User enters GitHub URL
    ↓
Frontend validation
    ↓
POST /api/repositories
    ↓
Backend Controller validates URL
    ↓
GitHub Service fetches repository metadata
    ↓
Store repository in PostgreSQL
    ↓
Return repository ID with INDEXING status
    ↓
Background Job triggered
    ↓
[Asynchronous Indexing Process - see Repository Indexing Flow]
```

### Repository Indexing Flow (Milestone 6+)

```
Background Job Starts
    ↓
GitHub Service fetches file tree
    ↓
File Processing Service (Milestone 4A)
    ├── File filtering
    ├── Language detection
    ├── Binary detection
    └─ File normalization
    ↓
GitHub Service downloads file contents
    ↓
Chunking Service (Milestone 4B - COMPLETED) splits into chunks
    ↓
Embedding Service (Milestone 5A - COMPLETED) generates vectors
    ├── OllamaEmbeddingProvider
    ├── Batch processing
    └─ Dimension validation
    ↓
Vector Service (Milestone 5B - COMPLETED) stores in Qdrant
    ↓
PostgreSQL stores metadata
    ↓
Update indexing status to COMPLETED
    ↓
Notify frontend of completion
```

### RAG Pipeline Flow (Milestone 7+)

```
User asks question
    ↓
Frontend sends question to backend
    ↓
POST /api/repositories/:id/chat
    ↓
Embedding Service converts question to vector
    ├── EmbeddingService.embedText()
    ├── OllamaEmbeddingProvider
    └─ Ollama API
    ↓
Vector Service searches Qdrant
    ↓
Retrieve top-K relevant chunks
    ↓
Context Builder formats chunks
    ↓
RAG Service constructs prompt
    ↓
AI Provider (Ollama) generates response
    ↓
Response Formatter adds citations
    ↓
Return answer + sources to frontend
    ↓
Frontend displays response with source links
```

### API Request Flow (General)

```
Client Request
    ↓
CORS Middleware
    ↓
Helmet Middleware (Security headers)
    ↓
Body Parsing Middleware
    ↓
Route Matching
    ↓
Request Validation (Zod schemas)
    ↓
Controller Layer
    ↓
Service Layer (Business Logic)
    ↓
Repository Layer (Database Access)
    ↓
Prisma Client (PostgreSQL)
    ↓
Database Query Execution
    ↓
Result Processing
    ↓
Response Formatting
    ↓
Error Handler (if error occurs)
    ↓
Response to Client
```

### Database Interaction Flow

```
Service Layer calls Repository
    ↓
Repository uses Prisma Client
    ↓
Prisma generates SQL query
    ↓
Query sent to PostgreSQL
    ↓
PostgreSQL executes query
    ↓
Results returned to Prisma
    ↓
Prisma converts to TypeScript objects
    ↓
Repository returns typed results
    ↓
Service processes results
    ↓
Controller formats response
```

### Background Job Flow

```
Job Triggered (e.g., repository indexing)
    ↓
Job Queue (Bull/Redis)
    ↓
Worker Process picks up job
    ↓
Load job parameters
    ↓
Execute job logic
    ├── Update progress in Redis
    ├── Update status in PostgreSQL
    └── Handle errors with retries
    ↓
Job completion
    ↓
Cleanup and notification
```

---

## Component Interaction Diagrams

### Frontend-Backend Communication

```
┌─────────────────┐         HTTP/REST         ┌─────────────────┐
│   Next.js       │ ◄──────────────────────► │   Express       │
│   Frontend      │                           │   Backend       │
└─────────────────┘                           └─────────────────┘
                                                      │
                              ┌─────────────────────────┼─────────────────────────┐
                              ↓                         ↓                         ↓
                      ┌──────────────┐        ┌──────────────┐        ┌──────────────┐
                      │ PostgreSQL   │        │    Redis     │        │    Qdrant    │
                      │  (Relational)│        │   (Cache)    │        │   (Vectors)  │
                      └──────────────┘        └──────────────┘        └──────────────┘
```

### Backend Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Express Routes                           │
│  (REST API Endpoints: /api/repositories, /api/chat, etc.)  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Controllers                              │
│         (Request validation, response formatting)           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     Services                                 │
│       (Business logic, orchestration, domain rules)         │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ↓               ↓               ↓
┌─────────────────────┐ ┌──────────────┐ ┌──────────────┐
│   Domain Services   │ │ Repositories │ │   External   │
│ (GitHub, Embeddings,│ │ (Prisma ORM) │ │   Services   │
│  Vector, RAG, etc.) │ │              │ │ (GitHub API, │
└─────────────────────┘ └──────────────┘ │  Ollama, etc)│
                              │         └──────────────┘
                              ↓
                      ┌──────────────┐
                      │  Databases   │
                      │ (PostgreSQL, │
                      │  Redis,      │
                      │  Qdrant)     │
                      └──────────────┘
```

### Embedding Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              EmbeddingService (Orchestration)               │
│  - Input validation                                          │
│  - Batch processing                                          │
│  - Dimension consistency validation                          │
│  - Configuration management                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│           EmbeddingProvider (Abstraction)                    │
│  - embedText(text)                                          │
│  - embedBatch(texts[])                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│          OllamaEmbeddingProvider (Implementation)            │
│  - HTTP client with timeout                                  │
│  - Native batch API with sequential fallback                 │
│  - Response validation                                       │
│  - Error mapping                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Ollama API                                │
│  - POST /api/embed                                          │
│  - Model: nomic-embed-text (configurable)                    │
│  - Local execution: http://localhost:11434                  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Example: Chat with Repository

```
┌─────────┐
│  User   │
└────┬────┘
     │ "How does auth work?"
     ↓
┌─────────────────┐
│   Frontend      │
│  (Next.js)      │
└────┬────────────┘
     │ POST /api/repositories/:id/chat
     ↓
┌─────────────────┐
│   Backend      │
│  (Express)     │
└────┬────────────┘
     │
     ├─→ Embedding Service → OllamaEmbeddingProvider → Ollama → Vector
     │
     ├─→ Vector Service → Qdrant Search → Relevant Chunks
     │
     ├─→ Context Builder → Format Chunks
     │
     ├─→ RAG Service → Build Prompt
     │
     ├─→ AI Provider → Ollama → Generate Response
     │
     └─→ Response Formatter → Add Citations
     ↓
┌─────────────────┐
│   Frontend      │
│  (Display)      │
└────┬────────────┘
     │ Answer + Sources
     ↓
┌─────────┐
│  User   │
└─────────┘
```

---

## Error Flow Examples

### Repository Not Found Flow

```
User requests non-existent repository
    ↓
Controller receives request
    ↓
Repository queries database
    ↓
Prisma returns null
    ↓
Repository throws NotFoundError
    ↓
Error Handler catches error
    ↓
Returns 404 with error message
    ↓
Frontend displays error to user
```

### GitHub API Rate Limit Flow

```
Indexing job runs
    ↓
GitHub Service makes API request
    ↓
GitHub returns 403 (rate limit)
    ↓
GitHub Service throws RateLimitError
    ↓
Job catches error
    ↓
Implement exponential backoff
    ↓
Retry after delay
    ↓
If retries exhausted: mark job as FAILED
```

### Database Connection Failure Flow

```
Application starts
    ↓
Prisma Client tries to connect
    ↓
Connection fails
    ↓
Prisma throws ConnectionError
    ↓
Error Handler catches error
    ↓
Log detailed error
    ↓
Return 500 Internal Server Error
    ↓
Application may exit or retry
```

---

## Startup Flow

### Backend Startup Sequence

```
1. Load .env file (dotenv)
2. Validate environment variables (Zod)
3. Initialize Prisma Client
4. Initialize Redis connection
5. Initialize Qdrant connection
6. Register Express middleware
7. Register API routes
8. Start HTTP server
9. Log startup information
10. Ready to handle requests
```

### Frontend Startup Sequence

```
1. Load environment variables
2. Initialize Next.js
3. Compile React components
4. Start development server
5. Apply Tailwind CSS
6. Ready to serve pages
```

### Docker Services Startup Sequence

```
1. Create network (github-knowledge-network)
2. Create volumes (postgres_data, redis_data, qdrant_data)
3. Start PostgreSQL container
4. Start Redis container
5. Start Qdrant container
6. Wait for health checks
7. Services ready
```

---

## Debugging Flow

### When Debugging Frontend Issues:

1. Check browser console for errors
2. Verify API calls in Network tab
3. Check React component state
4. Verify environment variables
5. Check Next.js logs

### When Debugging Backend Issues:

1. Check server logs
2. Verify environment variables are loaded
3. Check database connection
4. Verify Redis connection
5. Check Qdrant connection
6. Test API endpoints directly
7. Check error logs

### When Debugging Database Issues:

1. Check PostgreSQL container is running
2. Verify DATABASE_URL is correct
3. Test database connection
4. Check Prisma schema is valid
5. Run Prisma migrations
6. Check database logs

### When Debugging AI/Vector Issues:

1. Check Ollama is running
2. Verify Ollama models are pulled
3. Test Ollama API directly
4. Check Qdrant container is running
5. Verify vector collection exists
6. Check embedding generation
7. Test vector search

---

## Performance Flow

### Caching Flow (Planned)

```
Request → Check Redis Cache
    ↓
    ├─ Cache Hit → Return cached data
    └─ Cache Miss → Query database
                        ↓
                    Store in Redis
                        ↓
                    Return data
```

### Rate Limiting Flow (Planned)

```
Request → Check Redis for request count
    ↓
    ├─ Under limit → Increment count, process request
    └─ Over limit → Return 429 Too Many Requests
```

---

## Future Flow Documentation

As the project grows, this file will be updated with:
- Detailed flows for each service
- API request/response flows
- Background job processing flows
- Authentication flows
- Error recovery flows
- Data transformation flows
- External API integration flows

---

## Template for New Flow Documentation

### [Feature/Component Name] Flow

```
Step 1
    ↓
Step 2
    ↓
Step 3
    ↓
[Continue as needed]
```

**Key Interactions:**
- Component A → Component B
- Database X involved
- External API Y called

**Error Cases:**
- Error condition → Error handling
- Recovery mechanism

**Performance Considerations:**
- Caching strategy
- Optimization points

## Current Architecture (Milestone 4B Complete)

## Background Indexing Foundation (Milestone 6A)

```
Create Indexing Job
    ↓
PostgreSQL IndexingJob (PENDING; durable source of truth)
    ↓
IndexingJobQueue.enqueue({ jobId, repositoryId })
    ↓
Redis pending list + job-id membership set
    ↓
Worker atomically moves item to Redis processing list
    ↓
PostgreSQL status becomes INDEXING
    ↓
Injected Job Handler (Milestone 6B indexing handler: PENDING)
    ↓
    ├─ Success → PostgreSQL COMPLETED → Redis acknowledgement
    ├─ Retryable failure within limit → PostgreSQL FAILED (error retained)
    │                              → Redis retry metadata/pending list
    │                              → PostgreSQL PENDING for next attempt
    └─ Non-retryable or exhausted failure → PostgreSQL FAILED → Redis cleanup
```

**Progress flow:** a future handler calls `IndexingJobService.updateProgress`; progress (0–100), current step, and actual file/chunk/embedding counters are validated and persisted in PostgreSQL. Redis never stores permanent progress.

**Idempotency:** Redis membership uses the existing indexing-job ID as operation identity. A duplicate enqueue returns `false`; acknowledgement or terminal failure frees the ID for a later explicit operation.

**Milestone 6B - PENDING:** The handler will perform GitHub retrieval, filtering/normalization, chunking, embedding generation, and Qdrant writes. None of those steps are implemented by 6A.

```
ProcessedFile
    ↓
ChunkingService
    ↓
Strategy Selection
    ↓
Code / Markdown / Fallback Strategy
    ↓
Chunk Validation
    ↓
Metadata Creation
    ↓
Deterministic ID
    ↓
CodeChunk[]
    ↓
Milestone 5 (PENDING)
```
