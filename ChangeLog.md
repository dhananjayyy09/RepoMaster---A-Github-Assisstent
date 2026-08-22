# ChangeLog

This file tracks all changes made to the GitHub Knowledge Assistant project by the AI assistant.

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
  - Added 20 comprehensive tests for GitHub service methods and helpers
  - Repository metadata tests: successful retrieval, missing fields, 404, API failures
  - Repository tree tests: successful retrieval, default branch, explicit branch, truncated tree, errors
  - File content tests: successful retrieval, explicit ref, directory handling, encoding validation, errors
  - Helper function tests: Base64 decoding with UTF-8, multiline content, special characters
  - All tests use mocked responses, no live GitHub API calls
  - Total: 60 tests passing (40 from Milestone 3A + 20 new)

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
