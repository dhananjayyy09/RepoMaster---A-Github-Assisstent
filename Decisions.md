# Decisions

This file documents the rationale behind key technical decisions made during the development of the GitHub Knowledge Assistant.

## Architecture Decisions

### Modular Monolith Architecture
**Decision:** Chose modular monolith over microservices
**Rationale:**
- Solo project constraint: Microservices would add unnecessary complexity
- Easier deployment and development for a single developer
- Still maintains clear separation of concerns through modular structure
- Can evolve to microservices later if needed without major refactoring
- Reduced operational overhead (single deployment, single monitoring)

### Monorepo Structure
**Decision:** Used monorepo with separate frontend and backend directories
**Rationale:**
- Clear separation of concerns while keeping codebase unified
- Shared configuration and tooling can be centralized
- Easier to manage dependencies separately for frontend/backend
- Facilitates future code sharing if needed
- Simple version control and CI/CD setup

## Technology Stack Decisions

### Next.js for Frontend
**Decision:** Selected Next.js 16.3.0 over other frameworks
**Rationale:**
- Built-in server-side rendering and static site generation
- Excellent developer experience with hot reload
- Strong TypeScript support
- Built-in API routes (though we're using separate backend)
- Large community and ecosystem
- Performance optimizations out of the box
- Future-proof with active development

### Express.js for Backend
**Decision:** Chose Express 5.2.1 over alternatives like Fastify or NestJS
**Rationale:**
- Mature, battle-tested framework with extensive documentation
- Minimal setup time for initial development
- Large middleware ecosystem
- Flexible architecture for adding structure later
- Easy to learn and debug
- Sufficient performance for this use case

### PostgreSQL + Prisma
**Decision:** Selected PostgreSQL with Prisma ORM
**Rationale:**
- **PostgreSQL:** Robust relational database with advanced features
  - JSON support for flexible schema evolution
  - Excellent performance and reliability
  - Strong consistency guarantees
  - Rich feature set (indexes, constraints, etc.)
- **Prisma:** Type-safe ORM with excellent developer experience
  - Auto-generated TypeScript types
  - Excellent migration system
  - Great for rapid development
  - Strong community support

### Qdrant for Vector Database
**Decision:** Chose Qdrant over alternatives like Pinecone or Weaviate
**Rationale:**
- Open-source and self-hosted (no vendor lock-in)
- Excellent performance with HNSW indexing
- Simple deployment via Docker
- Good filtering capabilities for metadata
- Active development and community
- Cost-effective for development

### Redis for Caching
**Decision:** Added Redis to the stack
**Rationale:**
- Efficient caching for frequently accessed data
- Rate limiting implementation
- Job state management for background indexing
- Session storage if needed later
- Simple and reliable
- Excellent performance

### Ollama for AI
**Decision:** Selected Ollama as initial AI provider
**Rationale:**
- Local execution - no API costs during development
- Privacy - data stays on local machine
- No API rate limits
- Supports multiple models (LLM and embeddings)
- Easy to switch to cloud providers later via abstraction layer
- Cost-effective for development and testing

## Implementation Decisions

### TypeScript Throughout
**Decision:** Strict TypeScript enforcement in both frontend and backend
**Rationale:**
- Type safety reduces runtime errors
- Better IDE support and autocomplete
- Self-documenting code
- Easier refactoring
- Catches errors at compile time
- Industry standard for modern JavaScript development

### Zod for Validation
**Decision:** Used Zod for environment variable validation
**Rationale:**
- Runtime type validation
- Excellent TypeScript inference
- Schema-first approach
- Easy to define complex validation rules
- Better than manual checks or JSON schema
- Works well with TypeScript

### Provider Abstraction for AI
**Decision:** Implemented provider abstraction for AI services
**Rationale:**
- Easy to switch between Ollama, OpenAI, Anthropic
- No tight coupling to specific AI provider
- Can test different providers easily
- Future-proof for production (switch to cloud providers)
- Supports A/B testing of different models
- Reduces vendor lock-in

### Environment Variable Validation at Startup
**Decision:** Validate all environment variables when backend starts
**Rationale:**
- Fail fast - catch configuration errors immediately
- Prevents runtime errors due to missing configuration
- Clear error messages for developers
- Type-safe configuration access
- Better than discovering issues in production

### CORS Configuration
**Decision:** Explicitly configured CORS with specific origin
**Rationale:**
- Security best practice
- Prevents unauthorized cross-origin requests
- Configurable for different environments
- Better than wildcard which is insecure
- Needed for frontend-backend communication

### Error Handling Middleware
**Decision:** Centralized error handling in Express middleware
**Rationale:**
- Consistent error responses across all endpoints
- Prevents stack trace leakage in production
- Easy to add logging and monitoring
- Custom error classes for different error types
- Better error messages for API consumers

### Prisma 5.x Instead of 7.x
**Decision:** Downgraded from Prisma 7.x to 5.22.0
**Rationale:**
- Prisma 7 introduced breaking changes to configuration system
- Prisma 5 is stable and widely used
- Simpler configuration without need for prisma.config.ts
- Better documentation and community support
- Avoids complexity of new config system
- Sufficient features for this project

### tsx Instead of ts-node
**Decision:** Switched from ts-node to tsx for TypeScript execution
**Rationale:**
- Better compatibility with Node.js v25
- Faster startup time
- Better error messages
- More actively maintained
- No additional configuration needed
- Resolved compatibility issues

### Docker for Infrastructure
**Decision:** Used Docker Compose for local development infrastructure
**Rationale:**
- Consistent development environment across machines
- Easy to spin up and tear down services
- Version-controlled infrastructure configuration
- Isolates dependencies from host system
- Mimics production deployment
- Simple onboarding for new developers

### Health Check Endpoint
**Decision:** Implemented `/api/health` endpoint
**Rationale:**
- Easy verification that backend is running
- Useful for load balancers and monitoring
- Simple debugging tool
- Standard practice for microservices
- Helps with deployment verification

### Tailwind CSS for Styling
**Decision:** Selected Tailwind CSS 4 for styling
**Rationale:**
- Utility-first approach for rapid development
- No custom CSS files to maintain
- Consistent design system
- Excellent performance (purge unused styles)
- Easy to customize
- Industry standard for modern web development

## File Structure Decisions

### Single Prisma Schema
**Decision:** Consolidated to single Prisma schema at `backend/prisma/schema.prisma`
**Rationale:**
- Single source of truth for database schema
- No synchronization issues between multiple schemas
- Simpler to maintain
- Backend is the primary consumer of database
- Avoids merge conflicts
- Standard practice for monolithic applications

### Domain-Driven Directory Structure
**Decision:** Organized backend by domain (services, repositories, controllers)
**Rationale:**
- Clear separation of concerns
- Easy to locate functionality
- Follows DDD principles
- Scalable as project grows
- Testable in isolation
- Common pattern in Express applications

### Core Data Layer Separation
**Decision:** Use a shared Prisma client, repositories for data access, and services for validation and domain rules.
**Rationale:**
- Keeps Prisma queries out of future controllers and API routes.
- Allows business rules, such as duplicate repository prevention and progress validation, to remain testable.
- Prevents repeated Prisma Client construction and excess development connections.
- Provides a clear location for future orchestration without implementing later milestones early.

### Version-Controlled Prisma Migrations
**Decision:** Commit Prisma migration files and preserve already-applied migration history.
**Rationale:**
- Every environment needs the same reproducible schema evolution path.
- Editing an applied migration can cause environments to diverge.
- The `RUNNING` to `INDEXING` terminology update uses a second migration rather than rewriting the initial migration.

### Application-Level Database Errors
**Decision:** Map Prisma failures to custom application errors before they reach Express error handling.
**Rationale:**
- Prevents raw database implementation details from reaching clients.
- Produces consistent responses for conflicts, missing records, invalid references, and unexpected database failures.
- Keeps error translation centralized rather than duplicating it in every repository.

## GitHub Integration Decisions

### GitHub REST API Choice
**Decision:** Using GitHub REST API for repository metadata and file access
**Rationale:**
- Well-documented and stable API
- Comprehensive coverage of repository operations
- Rate limit headers provide quota information
- No need for complex GraphQL queries for this use case
- Simple HTTP client implementation
- Industry standard for GitHub integration

### GitHub Module Isolation
**Decision:** Created dedicated GitHub module separate from business logic
**Rationale:**
- Keeps external API communication isolated
- Easy to test GitHub client independently
- Can swap GitHub API implementation if needed
- Clear separation of concerns
- Prevents GitHub-specific code from spreading through codebase
- Follows single responsibility principle

### GitHub Token Optional
**Decision:** Made GitHub authentication token optional in configuration
**Rationale:**
- Allows development without personal access tokens
- GitHub public API has generous rate limits for unauthenticated requests
- Production can enable with environment variable
- No barrier to entry for development
- Security: tokens never committed to source control
- Follows principle of secure defaults

### URL Parsing with URL API
**Decision:** Used browser URL API instead of pure regex for GitHub URL parsing
**Rationale:**
- More robust than regex for URL parsing
- Handles edge cases automatically (encoding, normalization)
- Easier to maintain and understand
- Type-safe with TypeScript
- Better error handling for malformed URLs
- Leverages built-in browser/node APIs

### Jest for Testing
**Decision:** Selected Jest as testing framework for backend
**Rationale:**
- Built-in mocking capabilities for HTTP requests
- Excellent TypeScript support via ts-jest
- Zero configuration for most use cases
- Fast test execution
- Good snapshot testing for future use
- Industry standard for Node.js testing
- Easy to integrate with CI/CD

### TypeScript Version for Jest Compatibility
**Decision:** Downgraded TypeScript from 7.0.2 to 5.7.2 for ts-jest compatibility
**Rationale:**
- ts-jest had compatibility issues with TypeScript 7.x
- TypeScript 5.7.2 is stable and well-supported
- No loss of features needed for this project
- Maintains type safety and developer experience
- Resolves Jest compilation errors without workarounds

### Error Prototype Chain Fix
**Decision:** Added Object.setPrototypeOf calls to GitHub error constructors
**Rationale:**
- TypeScript/JavaScript instanceof checks require proper prototype chain
- Custom error classes need explicit prototype setup
- Ensures error handling works correctly with instanceof
- Resolves Jest test failures expecting specific error types
- Follows JavaScript best practices for custom errors
- Prevents errors from being caught as generic AppError

### Deterministic GitHub Tests
**Decision:** Used mocked responses instead of real GitHub API calls in tests
**Rationale:**
- Tests run without external dependencies
- No rate limit consumption during testing
- Consistent test results regardless of GitHub status
- Faster test execution
- Can test error scenarios easily
- Standard practice for external API testing
- Prevents flaky tests due to network issues

### Repository Metadata Mapping
**Decision:** Created application-level `RepositoryMetadata` type separate from GitHub API response
**Rationale:**
- Decouples application from GitHub API structure changes
- Provides clean, stable interface for rest of application
- Only includes relevant fields needed by the application
- Enables easy switching between GitHub API versions
- Follows principle of isolation from external dependencies
- Makes code more maintainable and testable

### Git Trees API for Repository Tree
**Decision:** Used GitHub Git Trees API with recursive=1 for repository tree retrieval
**Rationale:**
- Single API call retrieves entire repository structure
- More efficient than multiple directory traversal calls
- GitHub handles the recursion logic
- Returns both files and directories in single response
- Standard GitHub API for tree operations
- Better performance than manual directory walking

### Truncated Tree Handling
**Decision:** Throw `GitHubTreeTruncatedError` immediately when GitHub returns truncated tree
**Rationale:**
- Prevents silent data loss in large repositories
- Forces explicit handling of incomplete data
- GitHub API limitation that cannot be worked around in simple way
- Complex fallback crawling deferred to later milestones
- Maintains data integrity by failing fast
- Clear error communication to calling code

### GitHub Contents API for File Retrieval
**Decision:** Used GitHub Contents API for individual file content retrieval
**Rationale:**
- Official GitHub API for file operations
- Returns Base64-encoded content ready for decoding
- Provides file metadata (size, sha, encoding)
- Supports ref parameter for branch-specific retrieval
- Standard approach for GitHub file access
- Better than raw git blob API for this use case

### Base64 Decoding Approach
**Decision:** Decode Base64 content to UTF-8 strings with the `decodeBase64Content()` utility, called by the GitHub service.
**Rationale:**
- GitHub API returns Base64-encoded content
- Application needs text content for processing
- A focused utility keeps decoding reusable and keeps the service responsible for orchestration
- UTF-8 assumption reasonable for source code repositories
- Centralized decoding logic, consistent behavior
- Error handling at appropriate layer

### GitHub API Version Constant
**Decision:** Define the GitHub REST API version once as `GITHUB_API_VERSION` in the GitHub client.
**Rationale:**
- Prevents the version string from being duplicated across request code.
- Makes a future API-version upgrade a one-line change.
- Keeps all request-header configuration owned by the HTTP client.

### Binary File Detection
**Decision:** Check file type and encoding before attempting content processing
**Rationale:**
- Prevents attempting to decode binary files as text
- GitHub API provides type field (file vs directory)
- Encoding field indicates content format
- Fail fast for unsupported content types
- Defers complex binary file handling to later milestones
- Maintains clean separation of concerns

### Application-Level Type Boundary
**Decision:** Maintain strict separation between GitHub API types and application types
**Rationale:**
- Rest of application should not depend on GitHub-specific structures
- Enables easy replacement of GitHub API if needed
- Cleaner interfaces for file processing and chunking
- Better encapsulation of external API details
- Follows dependency inversion principle
- Makes code more maintainable and testable

### Database Boundary
**Decision:** Keep GitHub service completely independent of database operations
**Rationale:**
- GitHub service focuses solely on API communication
- Database operations belong to orchestration layer
- Enables flexible future data processing pipelines
- Makes GitHub service reusable in different contexts
- Clear separation of concerns
- Easier to test GitHub functionality in isolation

### Manual Verification Strategy
**Decision:** Created separate manual verification script against real GitHub repository
**Rationale:**
- Validates integration with actual GitHub API
- Tests against real-world repository structure
- Confirms Base64 decoding works with real content
- Separate from automated test suite to avoid dependencies
- Provides confidence in implementation
- Uses stable public repository (facebook/react) for reliability

## File Processing Decisions

### File Processing Module Separation
**Decision:** Created dedicated file-processing module separate from GitHub integration
**Rationale:**
- File processing logic is independent of GitHub API communication
- Easy to test file processing without GitHub dependencies
- Can swap file processing implementation if needed
- Clear separation of concerns follows single responsibility principle
- Enables future reuse with other sources beyond GitHub
- Prevents file processing logic from spreading through codebase

### Structured Filtering Results
**Decision:** Return structured FileFilterResult instead of throwing exceptions for normal filtering
**Rationale:**
- Filtering is expected behavior, not an error condition
- Distinguishes between business logic (filtering) and failures (errors)
- Enables batch processing without exception handling overhead
- Clear status communication: PROCESSABLE, UNSUPPORTED, BINARY, TOO_LARGE
- Allows calling code to make decisions based on filtering results
- More efficient than try-catch for expected filtering scenarios

### 1MB File Size Limit
**Decision:** Set default max file size to 1MB (1048576 bytes)
**Rationale:**
- Appropriate for source code files (most source files are < 100KB)
- Prevents processing of large binaries or generated files
- Configurable via environment variable for different use cases
- Conservative limit ensures performance for chunking stage
- Large files can be excluded during tree traversal (size available in GitHub API)
- Balance between inclusivity and performance

### Extension-Based Language Detection
**Decision:** Use deterministic file extension mapping for language detection
**Rationale:**
- Sufficient for source code repositories (extensions are reliable)
- No ML model dependencies or computational overhead
- Fast and predictable
- Easy to extend with new languages
- Special filename support for Dockerfile, Makefile, etc.
- Industry standard approach for language detection
- ML-based detection overkill for this use case

### Configurable Filtering Rules
**Decision:** Made filtering rules configurable via FileProcessingConfig
**Rationale:**
- Different projects may have different requirements
- Can extend ignored directories/extensions without code changes
- Allows per-project customization
- Future-proof for enterprise use cases
- Sensible defaults provided out of the box
- Supports both default and custom configurations

### Conservative Binary Detection
**Decision:** Use simple heuristics for binary detection (null bytes, non-printable ratio)
**Rationale:**
- Sufficient for preventing binary data from entering text processing pipeline
- Fast and lightweight
- No external dependencies
- Combines extension-based and content-based detection
- False positives acceptable (conservative approach)
- Advanced binary classification unnecessary for this milestone

### Application-Level ProcessedFile Type
**Decision:** Created ProcessedFile interface separate from GitHub types
**Rationale:**
- Decouples file processing from GitHub API structure
- Provides clean, stable interface for chunking stage
- Normalized metadata across different sources
- Only includes relevant fields needed by application
- Enables easy switching between file sources
- Follows principle of isolation from external dependencies

### Path Normalization
**Decision:** Normalize all paths to use forward slashes consistently
**Rationale:**
- Cross-platform compatibility (Windows uses backslashes)
- Consistent path handling in database and processing
- Forward slashes are web standard
- GitHub API uses forward slashes
- Prevents platform-specific bugs
- Simple and effective normalization

### Binary Extension Blacklist
**Decision:** Maintain explicit blacklist of binary extensions rather than whitelist
**Rationale:**
- New binary formats emerge regularly
- Whitelist would require constant updates
- Blacklist of common binaries covers most cases
- Unknown extensions default to PROCESSABLE for safety
- Content-based detection catches missed binaries
- Conservative approach prioritizes not missing source code

### Minified File Detection
**Decision:** Detect and reject minified files using regex patterns
**Rationale:**
- Minified files have reduced semantic value for code understanding
- Patterns like .min.js, .min.css are standard conventions
- Prevents noise in chunking and embedding stages
- Easy to extend with additional patterns
- Build artifacts typically in ignored directories anyway
- Improves quality of processed content

### Special Filename Support
**Decision:** Support special files without extensions (Dockerfile, Makefile, etc.)
**Rationale:**
- These files contain important configuration and build logic
- Standard in many repositories
- No extension but clearly identifiable by name
- Valuable for code understanding and documentation
- Language detection handles exact name matches
- Industry-standard practice

### Separate Utils Module
**Decision:** Created file-processing.utils.ts for shared utility functions
**Rationale:**
- Reusable functions across services
- Clear separation of concerns
- Easy to test utilities independently
- Prevents code duplication
- Binary detection, path normalization used by multiple services
- Follows single responsibility principle

### No Database Operations in Milestone 4A
**Decision:** Keep file processing completely independent of database
**Rationale:**
- File processing is a transformation layer, not persistence
- Database operations belong to orchestration layer (future indexing pipeline)
- Makes file processing reusable in different contexts
- Easier to test without database dependencies
- Clear separation: GitHub → File Processing → (Future) Database
- Follows existing pattern from GitHub service

### Integration with GitHub Module
**Decision:** File processing consumes GitHub application-level types (TreeItem, FileContent)
**Rationale:**
- Clean boundary between modules
- Reuses existing type definitions
- No tight coupling to GitHub API responses
- Can work with other file sources in future
- Consistent with existing architecture
- Single direction of dependency

## Chunking Decisions

### Strategy Pattern for Chunking
**Decision:** Implemented strategy pattern with multiple chunking strategies
**Rationale:**
- Enables different chunking approaches for different file types
- Easy to add new strategies without modifying service logic
- Clean separation between strategy selection and implementation
- Modular design allows AST-aware strategies later
- Prevents hundreds of language-specific if/else branches
- Follows open/closed principle

### Layered Strategy Selection
**Decision:** Strategy priority: Markdown → Code-aware → Line-based fallback
**Rationale:**
- Markdown has specific structure (headings, code blocks) that needs special handling
- Code-aware for programming languages where structural detection is valuable
- Line-based as universal fallback for unknown languages
- Ensures every file can be chunked regardless of language
- Progressive complexity: specific → general → fallback
- Prevents processing failures for edge cases

### Code-Aware Chunking Without Full AST Parsing
**Decision:** Implemented practical code-aware chunking using regex and heuristics
**Rationale:**
- Full AST parsing for every language would add significant complexity
- Tree-sitter or compiler dependencies would bloat the project
- Regex-based detection is sufficient for common patterns (functions, classes, imports)
- Good enough for MVP and production use
- Can be enhanced with AST parsing later if needed
- Maintains modular design for future upgrades

### 100 Lines Default Chunk Size
**Decision:** Set default max chunk size to 100 lines
**Rationale:**
- Balances context preservation with embedding efficiency
- Most functions/classes fit within 100 lines
- Small enough for effective semantic search
- Large enough to maintain meaningful code context
- Configurable via environment variable for different use cases
- Industry standard for code chunking

### 10 Lines Default Overlap
**Decision:** Set default chunk overlap to 10 lines
**Rationale:**
- Provides context continuity between chunks
- Helps prevent cutting important statements
- Minimal overhead for embedding costs
- Sufficient for most code boundaries
- Configurable for different needs
- Prevents loss of context at chunk boundaries

### Deterministic Chunk IDs
**Decision:** Generate chunk IDs based on file SHA, path, index, and configuration
**Rationale:**
- Same input always produces same chunk IDs
- Enables caching and deduplication
- No random UUIDs that change between runs
- Simple hash function without external dependencies
- Includes configuration in hash to detect config changes
- Essential for reproducible processing

### Simple Hash Function vs Crypto Library
**Decision:** Implemented custom simple hash function instead of using Node.js crypto
**Rationale:**
- No external dependencies needed
- Sufficient for deduplication and caching
- Faster than SHA-256 for this use case
- Consistent with project's minimal dependency philosophy
- Deterministic and collision-resistant enough for chunk IDs
- Easy to understand and maintain

### Line-Aware Chunking
**Decision:** Never split chunks in the middle of a line
**Rationale:**
- Code readability preserved in chunks
- Prevents syntax errors in partial code snippets
- Better for LLM understanding and generation
- Line numbers remain meaningful
- Standard practice for code chunking
- Respects code structure

### Metadata Preservation
**Decision:** Preserve comprehensive metadata in each chunk
**Rationale:**
- Essential for future semantic search and source attribution
- File path enables context from repository structure
- Line numbers enable source code navigation
- Language enables language-specific processing
- File SHA enables version tracking
- Chunk index/total enables chunk ordering
- Chunk type enables filtering by semantic type

### Chunk Type Classification
**Decision:** Classify chunks by semantic type (CODE, FUNCTION, CLASS, IMPORT, etc.)
**Rationale:**
- Enables better semantic search (e.g., search only functions)
- Provides context for embedding models
- Useful for filtering and analysis
- Different chunk types may need different processing
- Reflects code structure in chunk organization
- Future-proof for advanced retrieval strategies

### Heuristic Boundary Classification
**Decision:** Classify common method, interface, and type declarations separately while retaining regex-based detection.
**Rationale:**
- Preserves useful semantic metadata without introducing a language parser framework.
- Allows method boundaries to split from surrounding class blocks where the syntax is recognizable.
- Keeps interface and type declarations distinct for future retrieval filters.
- Retains line-based fallback behavior for malformed or unsupported source.

### Import Grouping
**Decision:** Group consecutive import/include statements into single chunks
**Rationale:**
- Imports provide important context but don't need individual chunks
- Reduces chunk count and embedding costs
- Maintains dependency information
- Common pattern across languages (JavaScript, Python, C++, etc.)
- Prevents noise from many tiny import chunks
- Improves chunk quality for semantic search

### Oversized Structure Splitting
**Decision:** Split functions/classes that exceed max chunk size using line-based fallback
**Rationale:**
- Prevents oversized chunks that hurt embedding quality
- Maintains function integrity as much as possible
- Fallback to line-based when structure can't be preserved
- Ensures all code is chunked regardless of size
- Better than discarding oversized structures
- Safe and predictable behavior

### Markdown Heading-Aware Chunking
**Decision:** Keep headings with their associated content
**Rationale:**
- Headings provide semantic context for content
- Prevents useless chunks containing only headings
- Better for documentation understanding
- Maintains document structure in chunks
- Standard practice for document chunking
- Improves retrieval quality for documentation

### No Empty Chunks
**Decision:** Validate and skip chunks that are empty or whitespace-only
**Rationale:**
- Prevents wasted embedding computation
- Improves chunk quality for search
- Reduces noise in vector database
- Handles edge cases gracefully
- Better user experience for search results
- Prevents processing errors downstream

### Configuration Validation
**Decision:** Validate chunking configuration at service initialization
**Rationale:**
- Fail fast for invalid configuration
- Prevents runtime errors during chunking
- Clear error messages for developers
- Ensures maxChunkLines > 0 and overlap < max
- Consistent with existing configuration validation pattern
- Better than discovering issues during processing

### Batch Processing with Error Handling
**Decision:** Implement batch file processing that continues on individual failures
**Rationale:**
- One bad file shouldn't stop entire repository processing
- Graceful degradation for problematic files
- Enables partial indexing of repositories
- Better user experience for large repositories
- Consistent with file processing layer design
- Logs warnings for debugging without stopping execution

### Size Safety Limits
**Decision:** Add safety limits for file content size (50MB) and chunk content (10MB)
**Rationale:**
- Prevents memory exhaustion from pathological inputs
- Protects against denial-of-service attacks
- Ensures reasonable processing times
- Files already filtered by file processing layer
- Defense in depth approach
- Better than unbounded resource consumption

### Chunking Service Independence
**Decision:** Keep chunking service independent of external systems
**Rationale:**
- No GitHub API calls (consumes ProcessedFile)
- No database operations (produces in-memory CodeChunk)
- No vector database (Qdrant for future milestone)
- No AI provider (Ollama for future milestone)
- No caching (Redis for future milestone)
- Clean separation of concerns enables testing and reuse

### Integration with File Processing
**Decision:** Chunking consumes ProcessedFile objects from Milestone 4A
**Rationale:**
- Clean boundary between processing stages
- Reuses existing normalized file data
- No tight coupling to GitHub integration
- Can work with other file sources in future
- Consistent with layered architecture
- Single direction of dependency

## Security Decisions

### Helmet Middleware
**Decision:** Added Helmet security headers
**Rationale:**
- Sets important security headers automatically
- Protects against common web vulnerabilities
- Zero configuration security improvement
- Industry standard for Express applications
- Easy to implement

### Environment Variables for Secrets
**Decision:** Never commit secrets, use environment variables
**Rationale:**
- Security best practice
- Different configuration per environment
- Secrets not in version control
- Standard practice for configuration management
- Easy to rotate secrets

## Future Considerations

### Potential Future Changes
- **GraphQL vs REST:** May consider GraphQL for flexible API queries
- **Message Queue:** May add RabbitMQ/Redis Streams for better job processing
- **Monitoring:** Will add logging and monitoring (Prometheus, Grafana)
- **Authentication:** Will add JWT-based authentication system
- **Rate Limiting:** Will implement more sophisticated rate limiting
- **API Versioning:** Will add versioning for backwards compatibility

---

## Template for Future Decisions

### [Decision Name]
**Decision:** [Choice made]
**Rationale:**
- Reason 1
- Reason 2
- Reason 3

**Alternatives Considered:**
- Alternative 1 - why not chosen
- Alternative 2 - why not chosen

**Impact:**
- Positive impacts
- Potential drawbacks
