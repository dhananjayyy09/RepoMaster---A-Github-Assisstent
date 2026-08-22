import { z } from 'zod';
import { GitHubInvalidUrlError } from './github.errors';
import type { GitHubRepositoryUrl } from './github.types';

const githubUrlSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  url: z.string().url(),
});

export function parseGitHubRepositoryUrl(inputUrl: string): GitHubRepositoryUrl {
  try {
    const url = new URL(inputUrl);

    if (url.hostname !== 'github.com') {
      throw new GitHubInvalidUrlError('URL must be from github.com');
    }

    const pathname = url.pathname.replace(/^\/+|\/+$/g, '');
    const pathParts = pathname.split('/');

    if (pathParts.length < 2) {
      throw new GitHubInvalidUrlError('URL must contain owner and repository');
    }

    const owner = pathParts[0];
    let repo = pathParts[1];

    repo = repo.replace(/\.git$/, '');

    if (pathParts.length > 2) {
      const thirdPart = pathParts[2].toLowerCase();
      if (['issues', 'pull', 'blob', 'tree', 'wiki', 'actions', 'security', 'pulse', 'graphs', 'network', 'forks', 'stars', 'watchers'].includes(thirdPart)) {
        throw new GitHubInvalidUrlError('URL must be a repository URL, not a specific page');
      }
    }

    const validated = githubUrlSchema.parse({
      owner,
      repo,
      url: `https://github.com/${owner}/${repo}`,
    });

    return validated;
  } catch (error) {
    if (error instanceof GitHubInvalidUrlError) {
      throw error;
    }
    if (error instanceof z.ZodError) {
      throw new GitHubInvalidUrlError('Invalid GitHub repository URL format');
    }
    if (error instanceof TypeError) {
      throw new GitHubInvalidUrlError('Invalid GitHub repository URL format');
    }
    throw new GitHubInvalidUrlError('Failed to parse GitHub repository URL');
  }
}

export function isValidGitHubRepositoryUrl(inputUrl: string): boolean {
  try {
    parseGitHubRepositoryUrl(inputUrl);
    return true;
  } catch {
    return false;
  }
}

export function decodeBase64Content(base64Content: string): string {
  return Buffer.from(base64Content, 'base64').toString('utf-8');
}
