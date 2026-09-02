import { Router } from 'express';
import { chatController } from './chat.controller';
import { validateBody, validateParams, validateQuery } from '../../middleware/validate';
import {
  createSessionSchema,
  sessionIdParamsSchema,
  repositoryIdParamsSchema,
  sendMessageSchema,
  listQuerySchema,
} from './chat.validators';

const router = Router();

// Sessions
router.post(
  '/sessions',
  validateBody(createSessionSchema),
  chatController.createSession
);

router.get(
  '/sessions/:sessionId',
  validateParams(sessionIdParamsSchema),
  chatController.getSession
);

router.delete(
  '/sessions/:sessionId',
  validateParams(sessionIdParamsSchema),
  chatController.deleteSession
);

router.get(
  '/repositories/:repositoryId/sessions',
  validateParams(repositoryIdParamsSchema),
  validateQuery(listQuerySchema),
  chatController.listSessionsByRepository
);

// Messages (nested under /sessions/:sessionId or directly under /:sessionId)
router.get(
  '/sessions/:sessionId/messages',
  validateParams(sessionIdParamsSchema),
  validateQuery(listQuerySchema),
  chatController.listMessages
);

router.post(
  '/sessions/:sessionId/messages',
  validateParams(sessionIdParamsSchema),
  validateBody(sendMessageSchema),
  chatController.sendMessage
);

// Direct aliases for convenience (/api/chat/:sessionId/messages, /api/chat/:sessionId)
router.get(
  '/:sessionId/messages',
  validateParams(sessionIdParamsSchema),
  validateQuery(listQuerySchema),
  chatController.listMessages
);

router.post(
  '/:sessionId/messages',
  validateParams(sessionIdParamsSchema),
  validateBody(sendMessageSchema),
  chatController.sendMessage
);

router.get(
  '/:sessionId',
  validateParams(sessionIdParamsSchema),
  chatController.getSession
);

router.delete(
  '/:sessionId',
  validateParams(sessionIdParamsSchema),
  chatController.deleteSession
);

export default router;
