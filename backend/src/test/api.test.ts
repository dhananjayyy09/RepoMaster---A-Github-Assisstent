import request from 'supertest';
import { Application } from 'express';
import createApp from '../app';
import { repositoryService } from '../services/repository.service';
import { indexingJobService } from '../services/indexingJob.service';
import { JobStatus, IndexingStatus } from '@prisma/client';

// Mock the services
jest.mock('../services/repository.service');
jest.mock('../services/indexingJob.service');
// Mock GitHub utils to avoid live calls
jest.mock('../github/github.utils', () => ({
  parseGitHubRepositoryUrl: jest.fn().mockImplementation((url: string) => {
    if (url.includes('invalid')) return null;
    return { owner: 'testowner', repo: 'testrepo' };
  })
}));

describe('API Foundation (Milestone 8A)', () => {
  let app: Application;

  beforeAll(() => {
    app = createApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Repository API', () => {
    const mockRepo = {
      id: 'repo-123',
      userId: 'user-123',
      githubOwner: 'testowner',
      githubRepo: 'testrepo',
      githubUrl: 'https://github.com/testowner/testrepo',
      description: null,
      defaultBranch: 'main',
      stars: 0,
      forks: 0,
      primaryLanguage: null,
      fileCount: 0,
      indexedFileCount: 0,
      chunkCount: 0,
      indexingStatus: IndexingStatus.PENDING,
      indexingError: null,
      githubCreatedAt: new Date(),
      githubUpdatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('POST /api/repositories should validate URL and create repository', async () => {
      (repositoryService.createRepository as jest.Mock).mockResolvedValue(mockRepo);

      const response = await request(app)
        .post('/api/repositories')
        .send({
          githubUrl: 'https://github.com/testowner/testrepo'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('repo-123');
      expect(repositoryService.createRepository).toHaveBeenCalledWith(expect.objectContaining({
        githubOwner: 'testowner',
        githubRepo: 'testrepo',
      }));
    });

    it('POST /api/repositories should return 400 for invalid URL', async () => {
      const response = await request(app)
        .post('/api/repositories')
        .send({
          githubUrl: 'invalid-url'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid request body');
    });

    it('GET /api/repositories/:id should return a repository', async () => {
      (repositoryService.getRepositoryById as jest.Mock).mockResolvedValue(mockRepo);

      const response = await request(app)
        .get('/api/repositories/123e4567-e89b-12d3-a456-426614174000'); // Valid UUID

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('repo-123');
    });

    it('GET /api/repositories/:id should return 400 for invalid UUID', async () => {
      const response = await request(app)
        .get('/api/repositories/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid URL parameters');
    });
  });

  describe('Indexing API', () => {
    const mockJob = {
      id: 'job-123',
      repositoryId: 'repo-123',
      status: JobStatus.PENDING,
      error: null,
      progress: 0,
      currentStep: 'INITIALIZING',
      filesDiscovered: 0,
      filesProcessed: 0,
      chunksCreated: 0,
      embeddingsGenerated: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      startedAt: null,
      completedAt: null,
    };

    it('POST /api/indexing/:repositoryId/start should enqueue job', async () => {
      (indexingJobService.createAndEnqueueIndexingJob as jest.Mock).mockResolvedValue(mockJob);

      const response = await request(app)
        .post('/api/indexing/123e4567-e89b-12d3-a456-426614174000/start'); // Valid UUID

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('job-123');
      expect(indexingJobService.createAndEnqueueIndexingJob).toHaveBeenCalled();
    });

    it('GET /api/indexing/jobs/:jobId should return job status', async () => {
      (indexingJobService.getIndexingJobById as jest.Mock).mockResolvedValue(mockJob);

      const response = await request(app)
        .get('/api/indexing/jobs/123e4567-e89b-12d3-a456-426614174000'); // Valid UUID

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('PENDING');
    });
  });
});
