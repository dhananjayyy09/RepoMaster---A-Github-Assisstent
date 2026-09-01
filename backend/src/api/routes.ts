import { Router } from 'express';
import repositoriesRouter from './repositories/repositories.routes';
import indexingRouter from './indexing/indexing.routes';

const apiRouter = Router();

// Mount modules
apiRouter.use('/repositories', repositoriesRouter);
apiRouter.use('/indexing', indexingRouter);

export default apiRouter;
