import { Router } from 'express';
import { repositoriesController } from './repositories.controller';
import { chatController } from '../chat/chat.controller';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate';
import { 
  importRepositorySchema, 
  getRepositoryParamsSchema, 
  listRepositoriesQuerySchema 
} from './repositories.validators';
import { listQuerySchema } from '../chat/chat.validators';

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

// GET /api/repositories/:id/chat - List chat sessions for repository
router.get(
  '/:id/chat',
  validateParams(getRepositoryParamsSchema),
  validateQuery(listQuerySchema),
  chatController.listSessionsByRepository
);

export default router;

