import { GitHubClient } from './github.client';
import {
  GitHubRepositoryNotFoundError,
  GitHubApiError,
  GitHubTreeTruncatedError,
  GitHubFileNotFoundError,
  GitHubBinaryFileError,
} from './github.errors';
import {
  parseGitHubRepositoryUrl,
  decodeBase64Content,
} from './github.utils';
import type {
  GitHubRepositoryUrl,
  GitHubRepository,
  GitHubTreeResponse,
  GitHubTreeItem,
  GitHubFileContent,
  RepositoryMetadata,
  TreeItem,
  FileContent,
} from './github.types';

export class GitHubService {
  constructor(private client: GitHubClient = new GitHubClient()) {}

  async validateRepositoryUrl(url: string): Promise<GitHubRepositoryUrl> {
    return parseGitHubRepositoryUrl(url);
  }

  async getRepositoryMetadata(owner: string, repo: string): Promise<RepositoryMetadata> {
    try {
      const response = await this.client.get<GitHubRepository>(`/repos/${owner}/${repo}`);

      const githubRepo = response.data;

      return {
        owner: githubRepo.owner.login,
        name: githubRepo.name,
        fullName: githubRepo.full_name,
        url: `https://github.com/${githubRepo.full_name}`,
        description: githubRepo.description,
        defaultBranch: githubRepo.default_branch,
        stars: githubRepo.stargazers_count,
        forks: githubRepo.forks_count,
        primaryLanguage: githubRepo.language,
        size: githubRepo.size,
        createdAt: new Date(githubRepo.created_at),
        updatedAt: new Date(githubRepo.updated_at),
        pushedAt: new Date(githubRepo.pushed_at),
        visibility: githubRepo.visibility,
        isArchived: false, // GitHub API doesn't provide this directly in the basic response
      };
    } catch (error) {
      if (error instanceof GitHubApiError && error.statusCode === 404) {
        throw new GitHubRepositoryNotFoundError(`Repository ${owner}/${repo} not found`);
      }
      throw error;
    }
  }

  async getRepositoryTree(owner: string, repo: string, sha?: string): Promise<TreeItem[]> {
    try {
      const branch = sha || 'HEAD';
      const response = await this.client.get<GitHubTreeResponse>(
        `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
      );

      const githubTree = response.data;

      if (githubTree.truncated) {
        throw new GitHubTreeTruncatedError(
          `Repository tree for ${owner}/${repo} is truncated and cannot be fully processed`
        );
      }

      return githubTree.tree.map((item: GitHubTreeItem) => ({
        path: item.path,
        type: item.type === 'blob' ? 'file' : 'directory',
        sha: item.sha,
        size: item.size,
      }));
    } catch (error) {
      if (error instanceof GitHubTreeTruncatedError) {
        throw error;
      }
      if (error instanceof GitHubApiError && error.statusCode === 404) {
        throw new GitHubRepositoryNotFoundError(`Repository ${owner}/${repo} not found`);
      }
      throw error;
    }
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<FileContent> {
    try {
      const refParam = ref ? `?ref=${ref}` : '';
      const response = await this.client.get<GitHubFileContent>(
        `/repos/${owner}/${repo}/contents/${path}${refParam}`
      );

      const githubFile = response.data;

      if (githubFile.type !== 'file') {
        throw new GitHubBinaryFileError(
          `Path ${path} is not a file (type: ${githubFile.type})`
        );
      }

      if (githubFile.encoding !== 'base64') {
        throw new GitHubBinaryFileError(
          `File ${path} has unsupported encoding: ${githubFile.encoding}`
        );
      }

      const content = decodeBase64Content(githubFile.content);

      return {
        path: githubFile.path,
        content,
        sha: githubFile.sha,
        size: githubFile.size,
        encoding: githubFile.encoding,
      };
    } catch (error) {
      if (error instanceof GitHubBinaryFileError) {
        throw error;
      }
      if (error instanceof GitHubApiError && error.statusCode === 404) {
        throw new GitHubFileNotFoundError(`File ${path} not found in ${owner}/${repo}`);
      }
      throw error;
    }
  }
}

export const githubService = new GitHubService();
