import { Router } from 'express';
import { repositoriesController } from './repositories.controller';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate';
import { 
  importRepositorySchema, 
  getRepositoryParamsSchema, 
  listRepositoriesQuerySchema 
} from './repositories.validators';

const router = Router();

// POST /api/repositories - Import/register a repository
router.post(
  '/', 
  validateBody(importRepositorySchema), 
  repositoriesController.importRepository
);

// GET /api/repositories - List repositories
router.get(
  '/',
  validateQuery(listRepositoriesQuerySchema),
  repositoriesController.listRepositories
);

// GET /api/repositories/:id - Get a specific repository
router.get(
  '/:id',
  validateParams(getRepositoryParamsSchema),
  repositoriesController.getRepository
);

// DELETE /api/repositories/:id - Delete a specific repository
router.delete(
  '/:id',
  validateParams(getRepositoryParamsSchema),
  repositoriesController.deleteRepository
);

export default router;
