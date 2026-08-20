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
