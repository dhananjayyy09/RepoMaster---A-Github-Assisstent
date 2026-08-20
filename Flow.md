# Flow

This file documents the flow and interactions between different parts of the GitHub Knowledge Assistant codebase.

## Current System Flow (Milestone 1)

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
[Asynchronous Indexing Process]
```

### Repository Indexing Flow (Milestone 6+)

```
Background Job Starts
    ↓
GitHub Service fetches file tree
    ↓
File Filter Service filters relevant files
    ↓
GitHub Service downloads file contents
    ↓
File Parser Service parses code
    ↓
Chunking Service splits into chunks
    ↓
Embedding Service generates vectors
    ↓
Vector Service stores in Qdrant
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
     ├─→ Embedding Service → Ollama → Vector
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
