# ChangeLog

This file tracks all changes made to the GitHub Knowledge Assistant project by the AI assistant.

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

