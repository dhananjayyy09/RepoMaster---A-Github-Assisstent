import { Router } from 'express';
import { indexingController } from './indexing.controller';
import { validateParams } from '../../middleware/validate';
import { 
  startIndexingParamsSchema, 
  indexingJobParamsSchema 
} from './indexing.validators';

const router = Router();

// POST /api/indexing/:repositoryId/start - Start indexing a repository
router.post(
  '/:repositoryId/start',
  validateParams(startIndexingParamsSchema),
  indexingController.startIndexing
);

// GET /api/indexing/jobs/:jobId - Get status of an indexing job
router.get(
  '/jobs/:jobId',
  validateParams(indexingJobParamsSchema),
  indexingController.getJobStatus
);

export default router;
