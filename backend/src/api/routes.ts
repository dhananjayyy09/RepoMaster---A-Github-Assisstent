import { Router } from 'express';
import repositoriesRouter from './repositories/repositories.routes';
import indexingRouter from './indexing/indexing.routes';
import chatRouter from './chat/chat.routes';

const apiRouter = Router();

// Mount modules
apiRouter.use('/repositories', repositoriesRouter);
apiRouter.use('/indexing', indexingRouter);
apiRouter.use('/chat', chatRouter);

export default apiRouter;
