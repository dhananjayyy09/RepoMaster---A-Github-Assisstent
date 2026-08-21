# GitHub Knowledge Assistant
 
An AI-powered platform for understanding and interacting with GitHub repositories using natural language and RAG (Retrieval-Augmented Generation).

## Project Description

The GitHub Knowledge Assistant allows developers to:
- Import any public GitHub repository
- Understand codebases through natural language queries
- Explore code with semantic search
- Get AI-powered explanations grounded in actual repository code
- Analyze architecture and identify potential risks

**Technology Stack:**
- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** Express.js, TypeScript, Node.js
- **Database:** PostgreSQL with Prisma ORM
- **Vector Database:** Qdrant
- **Cache:** Redis
- **AI:** Ollama (local LLM and embeddings)
- **Infrastructure:** Docker, Docker Compose

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **Docker** and **Docker Compose**
- **Ollama** (for local AI processing)
- **Git**

### Check your environment

```bash
node --version
npm --version
docker --version
docker compose version
ollama --version
git --version
```

## Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd repomaster
```

### 2. Install dependencies

Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

Install backend dependencies:
```bash
cd backend
npm install
cd ..
```

### 3. Environment setup

Copy the example environment file and configure it:

```bash
cp .env.example backend/.env
```

Edit `backend/.env` with your configuration:

```env
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/github_knowledge_assistant

# Redis
REDIS_URL=redis://localhost:6379

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# GitHub
GITHUB_API_URL=https://api.github.com
GITHUB_TOKEN=your_github_token_optional

# AI Provider
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_LLM_MODEL=llama3
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# CORS
CORS_ORIGIN=http://localhost:3000

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

For the frontend, create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_NAME=GitHub Knowledge Assistant
```

## Docker Setup

### Start infrastructure services

Start PostgreSQL, Redis, and Qdrant containers:

```bash
docker compose up -d
```

### Check container status

```bash
docker compose ps
```

Expected output:
```
NAME                         STATUS
github-knowledge-postgres    Up (healthy)
github-knowledge-redis      Up (healthy)
github-knowledge-qdrant     Up (healthy)
```

### Stop infrastructure services

```bash
docker compose down
```

### Remove volumes (clean slate)

```bash
docker compose down -v
```

## Ollama Setup

### Install Ollama

If you haven't installed Ollama yet, download it from [ollama.com](https://ollama.com).

### Start Ollama service

```bash
ollama serve
```

### Pull required models

```bash
# Pull embedding model
ollama pull nomic-embed-text

# Pull LLM model
ollama pull llama3
```

### Verify Ollama is running

```bash
curl http://localhost:11434/api/tags
```

## Development

### Start the backend

```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:3001`

### Start the frontend

In a new terminal:

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:3000`

### Verify health check

```bash
curl http://localhost:3001/api/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "github-knowledge-assistant-api",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development"
}
```

## Available Scripts

### Backend

```bash
cd backend

# Development with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type checking
npm run type-check
```

### Frontend

```bash
cd frontend

# Development with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type checking
npm run type-check

# Lint code
npm run lint
```

## Project Structure

```
github-knowledge-assistant/
├── frontend/                 # Next.js frontend application
│   ├── app/                 # Next.js app directory
│   ├── components/          # React components
│   ├── lib/                 # Utility functions and API client
│   ├── package.json         # Frontend dependencies
│   └── tsconfig.json        # TypeScript configuration
├── backend/                 # Express backend application
│   ├── src/
│   │   ├── config/          # Configuration and environment variables
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── domain/          # Domain-specific services
│   │   ├── middleware/      # Express middleware
│   │   ├── repositories/    # Database access layer
│   │   ├── jobs/            # Background jobs
│   │   └── utils/           # Utility functions
│   ├── prisma/              # Prisma schema (single source of truth)
│   ├── package.json         # Backend dependencies
│   └── tsconfig.json        # TypeScript configuration
├── docker/                  # Docker configuration files
├── docker-compose.yml       # Infrastructure services
├── .env.example             # Environment variable template
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS FRONTEND                              │
│  React Components + Tailwind CSS + TypeScript                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS BACKEND                               │
│  API Routes + Controllers + Services + Domain Logic             │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ↓               ↓               ↓
┌───────────────────────┐ ┌──────────────┐ ┌──────────────┐
│    POSTGRESQL         │ │    REDIS     │ │    QDRANT    │
│  (Prisma ORM)         │ │   (State)    │ │  (Vectors)   │
└───────────────────────┘ └──────────────┘ └──────────────┘
                                │
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  GitHub API + Ollama AI Provider                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Current Status

**Milestone 1: Project Setup & Infrastructure** ✅

- ✅ Next.js frontend with TypeScript and Tailwind CSS
- ✅ Express backend with TypeScript
- ✅ PostgreSQL, Redis, Qdrant via Docker Compose
- ✅ Environment variable configuration
- ✅ Health check endpoint
- ✅ CORS configuration
- ✅ TypeScript compilation working
- ✅ Prisma setup (schema for Milestone 2)

**Next Milestone:** Database & Core Models

## Troubleshooting

### Docker containers won't start

```bash
# Check Docker is running
docker ps

# Check container logs
docker compose logs postgres
docker compose logs redis
docker compose logs qdrant

# Restart containers
docker compose restart
```

### Backend fails to start

```bash
# Check if port 3001 is already in use
netstat -ano | findstr :3001

# Verify environment variables are set
cd backend
cat .env

# Check TypeScript compilation
npm run type-check
```

### Frontend fails to start

```bash
# Check if port 3000 is already in use
netstat -ano | findstr :3000

# Verify environment variables
cd frontend
cat .env.local

# Check Next.js build
npm run build
```

### Ollama connection issues

```bash
# Verify Ollama is running
curl http://localhost:11434/api/tags

# Check Ollama models
ollama list

# Restart Ollama service
# Windows: Restart Ollama application
# Linux/Mac: ollama serve
```

### Database connection issues

```bash
# Check PostgreSQL container is healthy
docker compose ps postgres

# Test database connection
docker exec -it github-knowledge-postgres psql -U postgres -d github_knowledge_assistant
```

## License

MIT

## Contributing

This is a solo project. Contributions are not currently accepted.

## Support

For issues and questions, please refer to the project documentation or create an issue in the repository.
