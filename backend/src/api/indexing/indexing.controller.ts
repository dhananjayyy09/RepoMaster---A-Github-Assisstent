import { Request, Response, NextFunction } from 'express';
import { indexingJobService } from '../../services/indexingJob.service';
import { IndexingJobQueue, RedisClient } from '../../queue';
import { config } from '../../config';

// Initialize a shared queue instance for the API
const redisClient = new RedisClient(config.redis.url);
const jobQueue = new IndexingJobQueue(redisClient, config.redis.jobQueueName);

export class IndexingController {
  
  /**
   * Start indexing a repository
   */
  async startIndexing(req: Request, res: Response, next: NextFunction) {
    try {
      const { repositoryId } = req.params as { repositoryId: string };
      
      // We use createAndEnqueueIndexingJob which handles DB creation and pushing to Redis
      const job = await indexingJobService.createAndEnqueueIndexingJob(repositoryId, jobQueue);

      return res.status(202).json({
        success: true,
        data: job
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get an indexing job's status
   */
  async getJobStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { jobId } = req.params as { jobId: string };
      
      const job = await indexingJobService.getIndexingJobById(jobId);

      return res.status(200).json({
        success: true,
        data: job
      });
    } catch (error) {
      next(error);
    }
  }
}

export const indexingController = new IndexingController();
