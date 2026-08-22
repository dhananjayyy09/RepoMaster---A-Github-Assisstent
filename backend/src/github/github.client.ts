import { config } from '../config';
import { GitHubApiError, GitHubRateLimitError } from './github.errors';
import type { GitHubRateLimitInfo, GitHubResponse, GitHubErrorResponse } from './github.types';

const GITHUB_API_VERSION = '2022-11-28';

export class GitHubClient {
  private baseUrl: string;
  private token: string | undefined;
  private timeout: number;
  private userAgent: string;

  constructor(options?: {
    baseUrl?: string;
    token?: string;
    timeout?: number;
    userAgent?: string;
  }) {
    this.baseUrl = options?.baseUrl || config.github.apiUrl;
    this.token = options?.token || config.github.token;
    this.timeout = options?.timeout || 30000;
    this.userAgent = options?.userAgent || 'GitHub-Knowledge-Assistant/1.0';
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': this.userAgent,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private extractRateLimitInfo(headers: Response['headers']): GitHubRateLimitInfo | undefined {
    const limit = headers.get('X-RateLimit-Limit');
    const remaining = headers.get('X-RateLimit-Remaining');
    const reset = headers.get('X-RateLimit-Reset');

    if (limit && remaining && reset) {
      return {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        reset: parseInt(reset, 10),
        resetAt: new Date(parseInt(reset, 10) * 1000),
      };
    }

    return undefined;
  }

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Request timeout')) {
        throw new GitHubApiError('Request timeout', 408);
      }
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<GitHubResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.buildHeaders();

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: headers as RequestInit['headers'],
      });

      const rateLimitInfo = this.extractRateLimitInfo(response.headers);

      if (!response.ok) {
        if (response.status === 403) {
          const rateLimitInfo = this.extractRateLimitInfo(response.headers);
          throw new GitHubRateLimitError(
            'GitHub API rate limit exceeded',
            rateLimitInfo?.resetAt
          );
        }

        let errorBody: GitHubErrorResponse | undefined;
        try {
          errorBody = await response.json() as GitHubErrorResponse;
        } catch {
          // Ignore JSON parse errors
        }

        throw new GitHubApiError(
          errorBody?.message || `GitHub API request failed with status ${response.status}`,
          response.status,
          errorBody
        );
      }

      const data = await response.json() as T;

      return {
        data,
        rateLimitInfo,
      };
    } catch (error) {
      if (error instanceof GitHubApiError || error instanceof GitHubRateLimitError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new GitHubApiError(error.message, 500);
      }
      throw new GitHubApiError('Failed to fetch from GitHub API', 500);
    }
  }

  async post<T>(endpoint: string, body?: unknown): Promise<GitHubResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.buildHeaders();

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        } as RequestInit['headers'],
        body: body ? JSON.stringify(body) : undefined,
      });

      const rateLimitInfo = this.extractRateLimitInfo(response.headers);

      if (!response.ok) {
        if (response.status === 403) {
          const rateLimitInfo = this.extractRateLimitInfo(response.headers);
          throw new GitHubRateLimitError(
            'GitHub API rate limit exceeded',
            rateLimitInfo?.resetAt
          );
        }

        let errorBody: GitHubErrorResponse | undefined;
        try {
          errorBody = await response.json() as GitHubErrorResponse;
        } catch {
          // Ignore JSON parse errors
        }

        throw new GitHubApiError(
          errorBody?.message || `GitHub API request failed with status ${response.status}`,
          response.status,
          errorBody
        );
      }

      const data = await response.json() as T;

      return {
        data,
        rateLimitInfo,
      };
    } catch (error) {
      if (error instanceof GitHubApiError || error instanceof GitHubRateLimitError) {
        throw error;
      }
      throw new GitHubApiError('Failed to post to GitHub API', 500);
    }
  }
}

export const githubClient = new GitHubClient();
