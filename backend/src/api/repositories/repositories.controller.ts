import { Request, Response, NextFunction } from 'express';
import { repositoryService } from '../../services/repository.service';
import { parseGitHubRepositoryUrl } from '../../github/github.utils';
import { AppError, ValidationError } from '../../utils/errors';
import { userService } from '../../services/user.service';

export class RepositoriesController {
  
  /**
   * Import / Register a new GitHub repository
   */
  async importRepository(req: Request, res: Response, next: NextFunction) {
    try {
      const { githubUrl, userId } = req.body;
      
      const githubInfo = parseGitHubRepositoryUrl(githubUrl);
      if (!githubInfo) {
        throw new ValidationError('Could not parse GitHub URL to extract owner and repo');
      }

      // Hack for authless environment: resolve a dummy user if none provided
      let targetUserId = userId;
      if (!targetUserId) {
        // Attempt to find a default user, or create one if it doesn't exist.
        // In a real application, userId comes from req.user (auth middleware).
        const defaultEmail = 'dev@repomaster.local';
        const defaultUser = await userService.getOrCreateUser(defaultEmail);
        targetUserId = defaultUser.id;
        
        if (!targetUserId) {
          // Fallback: throw error if we couldn't resolve a dummy
          throw new ValidationError('userId is required until Authentication is implemented');
        }
      }

      const repository = await repositoryService.createRepository({
        userId: targetUserId,
        githubOwner: githubInfo.owner,
        githubRepo: githubInfo.repo,
        githubUrl: githubUrl
      });

      return res.status(201).json({
        success: true,
        data: repository
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List repositories
   */
  async listRepositories(req: Request, res: Response, next: NextFunction) {
    try {
      const { skip, take } = req.query as any;
      
      const repositories = await repositoryService.getAllRepositories({
        skip: skip ? Number(skip) : undefined,
        take: take ? Number(take) : undefined,
      });

      return res.status(200).json({
        success: true,
        data: repositories
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single repository by ID
   */
  async getRepository(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      
      const repository = await repositoryService.getRepositoryById(id);

      return res.status(200).json({
        success: true,
        data: repository
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a repository
   */
  async deleteRepository(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      
      await repositoryService.deleteRepository(id);

      return res.status(200).json({
        success: true,
        data: { message: 'Repository deleted successfully' }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const repositoriesController = new RepositoriesController();
