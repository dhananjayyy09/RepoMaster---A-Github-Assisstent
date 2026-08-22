import { parseGitHubRepositoryUrl, isValidGitHubRepositoryUrl, decodeBase64Content } from '../github/github.utils';
import { GitHubClient } from '../github/github.client';
import { GitHubService } from '../github/github.service';
import {
  GitHubInvalidUrlError,
  GitHubRateLimitError,
  GitHubApiError,
  GitHubRepositoryNotFoundError,
  GitHubTreeTruncatedError,
  GitHubFileNotFoundError,
  GitHubBinaryFileError,
} from '../github/github.errors';

describe('GitHub URL Parser', () => {
  describe('Valid URLs', () => {
    it('should parse standard GitHub repository URL', () => {
      const result = parseGitHubRepositoryUrl('https://github.com/facebook/react');
      expect(result).toEqual({
        owner: 'facebook',
        repo: 'react',
        url: 'https://github.com/facebook/react',
      });
    });

    it('should parse URL with trailing slash', () => {
      const result = parseGitHubRepositoryUrl('https://github.com/microsoft/vscode/');
      expect(result).toEqual({
        owner: 'microsoft',
        repo: 'vscode'
        ,
        url: 'https://github.com/microsoft/vscode',
      });
    });

    it('should parse URL with .git suffix', () => {
      const result = parseGitHubRepositoryUrl('https://github.com/user/repo.git');
      expect(result).toEqual({
        owner: 'user',
        repo: 'repo',
        url: 'https://github.com/user/repo',
      });
    });

    it('should parse URL with .git suffix and trailing slash', () => {
      const result = parseGitHubRepositoryUrl('https://github.com/user/repo.git/');
      expect(result).toEqual({
        owner: 'user',
        repo: 'repo',
        url: 'https://github.com/user/repo',
      });
    });

    it('should parse URL with query parameters', () => {
      const result = parseGitHubRepositoryUrl('https://github.com/user/repo?tab=readme');
      expect(result).toEqual({
        owner: 'user',
        repo: 'repo',
        url: 'https://github.com/user/repo',
      });
    });

    it('should parse URL with fragment', () => {
      const result = parseGitHubRepositoryUrl('https://github.com/user/repo#readme');
      expect(result).toEqual({
        owner: 'user',
        repo: 'repo',
        url: 'https://github.com/user/repo',
      });
    });

    it('should parse URL with query and fragment', () => {
      const result = parseGitHubRepositoryUrl('https://github.com/user/repo?tab=overview#about');
      expect(result).toEqual({
        owner: 'user',
        repo: 'repo',
        url: 'https://github.com/user/repo',
      });
    });
  });

  describe('Invalid URLs', () => {
    it('should reject non-GitHub URL', () => {
      expect(() => parseGitHubRepositoryUrl('https://gitlab.com/user/repo')).toThrow(GitHubInvalidUrlError);
    });

    it('should reject malformed URL', () => {
      expect(() => parseGitHubRepositoryUrl('not-a-url')).toThrow(GitHubInvalidUrlError);
    });

    it('should reject GitHub profile URL', () => {
      expect(() => parseGitHubRepositoryUrl('https://github.com/user')).toThrow(GitHubInvalidUrlError);
    });

    it('should reject GitHub organization URL', () => {
      expect(() => parseGitHubRepositoryUrl('https://github.com/org')).toThrow(GitHubInvalidUrlError);
    });

    it('should reject issue URL', () => {
      expect(() => parseGitHubRepositoryUrl('https://github.com/user/repo/issues/123')).toThrow(GitHubInvalidUrlError);
    });

    it('should reject pull request URL', () => {
      expect(() => parseGitHubRepositoryUrl('https://github.com/user/repo/pull/456')).toThrow(GitHubInvalidUrlError);
    });

    it('should reject blob URL', () => {
      expect(() => parseGitHubRepositoryUrl('https://github.com/user/repo/blob/main/file.ts')).toThrow(GitHubInvalidUrlError);
    });

    it('should reject tree URL', () => {
      expect(() => parseGitHubRepositoryUrl('https://github.com/user/repo/tree/main/src')).toThrow(GitHubInvalidUrlError);
    });

    it('should reject wiki URL', () => {
      expect(() => parseGitHubRepositoryUrl('https://github.com/user/repo/wiki')).toThrow(GitHubInvalidUrlError);
    });

    it('should reject actions URL', () => {
      expect(() => parseGitHubRepositoryUrl('https://github.com/user/repo/actions')).toThrow(GitHubInvalidUrlError);
    });

    it('should reject security URL', () => {
      expect(() => parseGitHubRepositoryUrl('https://github.com/user/repo/security')).toThrow(GitHubInvalidUrlError);
    });

    it('should reject pulse URL', () => {
      expect(() => parseGitHubRepositoryUrl('https://github.com/user/repo/pulse')).toThrow(GitHubInvalidUrlError);
    });

    it('should reject graphs URL', () => {
      expect(() => parseGitHubRepositoryUrl('https://github.com/user/repo/graphs')).toThrow(GitHubInvalidUrlError);
    });

    it('should reject network URL', () => {
      expect(() => parseGitHubRepositoryUrl('https://github.com/user/repo/network')).toThrow(GitHubInvalidUrlError);
    });

    it('should reject forks URL', () => {
      expect(() => parseGitHubRepositoryUrl('https://github.com/user/repo/forks')).toThrow(GitHubInvalidUrlError);
    });

    it('should reject stars URL', () => {
      expect(() => parseGitHubRepositoryUrl('https://github.com/user/repo/stars')).toThrow(GitHubInvalidUrlError);
    });

    it('should reject watchers URL', () => {
      expect(() => parseGitHubRepositoryUrl('https://github.com/user/repo/watchers')).toThrow(GitHubInvalidUrlError);
    });
  });

  describe('isValidGitHubRepositoryUrl', () => {
    it('should return true for valid URL', () => {
      expect(isValidGitHubRepositoryUrl('https://github.com/facebook/react')).toBe(true);
    });

    it('should return false for invalid URL', () => {
      expect(isValidGitHubRepositoryUrl('https://gitlab.com/user/repo')).toBe(false);
    });

    it('should return false for profile URL', () => {
      expect(isValidGitHubRepositoryUrl('https://github.com/user')).toBe(false);
    });

    it('should return false for issue URL', () => {
      expect(isValidGitHubRepositoryUrl('https://github.com/user/repo/issues/123')).toBe(false);
    });
  });

  describe('decodeBase64Content', () => {
    it('should decode base64 content to UTF-8 string', () => {
      const base64Content = Buffer.from('Hello, World!').toString('base64');
      const decoded = decodeBase64Content(base64Content);
      expect(decoded).toBe('Hello, World!');
    });

    it('should decode multiline content', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const base64Content = Buffer.from(content).toString('base64');
      const decoded = decodeBase64Content(base64Content);
      expect(decoded).toBe(content);
    });

    it('should handle special characters', () => {
      const content = 'Hello 世界 🌍';
      const base64Content = Buffer.from(content).toString('base64');
      const decoded = decodeBase64Content(base64Content);
      expect(decoded).toBe(content);
    });
  });
});

describe('GitHub Client', () => {
  let client: GitHubClient;

  beforeEach(() => {
    client = new GitHubClient({
      baseUrl: 'https://api.github.com',
      timeout: 5000,
    });
  });

  describe('successful response', () => {
    it('should handle successful GET request', async () => {
      const mockResponse = {
        data: { id: 1, name: 'test-repo' },
        rateLimitInfo: {
          limit: 5000,
          remaining: 4999,
          reset: Date.now() / 1000 + 3600,
          resetAt: new Date(Date.now() + 3600000),
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          'X-RateLimit-Limit': '5000',
          'X-RateLimit-Remaining': '4999',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
        }),
        json: async () => mockResponse.data,
      } as unknown as Response);

      const result = await client.get('/repos/test-owner/test-repo');
      expect(result.data).toEqual(mockResponse.data);
      expect(result.rateLimitInfo).toBeDefined();
    });
  });

  describe('non-2xx response', () => {
    it('should handle 404 error', async () => {
      const errorResponse = {
        message: 'Not Found',
        documentation_url: 'https://docs.github.com/rest',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers(),
        json: async () => errorResponse,
      } as unknown as Response);

      await expect(client.get('/repos/nonexistent/repo')).rejects.toThrow(GitHubApiError);
    });

    it('should handle 403 rate limit error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        headers: new Headers({
          'X-RateLimit-Limit': '5000',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
        }),
        json: async () => ({ message: 'API rate limit exceeded' }),
      } as unknown as Response);

      await expect(client.get('/repos/test/repo')).rejects.toThrow(GitHubRateLimitError);
    });

    it('should handle 500 error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: async () => ({ message: 'Internal Server Error' }),
      } as unknown as Response);

      await expect(client.get('/repos/test/repo')).rejects.toThrow(GitHubApiError);
    });
  });

  describe('timeout', () => {
    it('should handle request timeout', async () => {
      const timeoutClient = new GitHubClient({
        baseUrl: 'https://api.github.com',
        timeout: 1,
      });

      const abortError = new Error('Request timeout');
      abortError.name = 'AbortError';

      global.fetch = jest.fn().mockImplementation(
        () => new Promise((_, reject) => reject(abortError))
      );

      await expect(timeoutClient.get('/repos/test/repo')).rejects.toThrow(GitHubApiError);
    });
  });

  describe('rate limit headers', () => {
    it('should extract rate limit information', async () => {
      const mockHeaders = {
        'X-RateLimit-Limit': '5000',
        'X-RateLimit-Remaining': '4999',
        'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(mockHeaders),
        json: async () => ({ id: 1 }),
      } as unknown as Response);

      const result = await client.get('/repos/test/repo');
      expect(result.rateLimitInfo).toBeDefined();
      expect(result.rateLimitInfo?.limit).toBe(5000);
      expect(result.rateLimitInfo?.remaining).toBe(4999);
    });

    it('should handle missing rate limit headers', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ id: 1 }),
      } as unknown as Response);

      const result = await client.get('/repos/test/repo');
      expect(result.rateLimitInfo).toBeUndefined();
    });
  });

  describe('malformed JSON', () => {
    it('should handle malformed JSON response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as unknown as Response);

      await expect(client.get('/repos/test/repo')).rejects.toThrow();
    });
  });

  describe('headers', () => {
    it('should include User-Agent header', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ id: 1 }),
      } as unknown as Response);

      await client.get('/repos/test/repo');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String),
          }),
        })
      );
    });

    it('should include Accept header', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ id: 1 }),
      } as unknown as Response);

      await client.get('/repos/test/repo');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/vnd.github.v3+json',
          }),
        })
      );
    });

    it('should include GitHub API version header', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ id: 1 }),
      } as unknown as Response);

      await client.get('/repos/test/repo');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-GitHub-Api-Version': '2022-11-28',
          }),
        })
      );
    });

    it('should include Authorization header when token is provided', async () => {
      const clientWithToken = new GitHubClient({
        baseUrl: 'https://api.github.com',
        token: 'test-token',
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ id: 1 }),
      } as unknown as Response);

      await clientWithToken.get('/repos/test/repo');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });
  });
});

describe('GitHub Service', () => {
  let service: GitHubService;

  beforeEach(() => {
    service = new GitHubService();
  });

  describe('validateRepositoryUrl', () => {
    it('should validate and parse GitHub repository URL', async () => {
      const result = await service.validateRepositoryUrl('https://github.com/facebook/react');
      expect(result).toEqual({
        owner: 'facebook',
        repo: 'react',
        url: 'https://github.com/facebook/react',
      });
    });
  });

  describe('getRepositoryMetadata', () => {
    it('should retrieve repository metadata successfully', async () => {
      const mockRepoResponse = {
        id: 1,
        name: 'react',
        full_name: 'facebook/react',
        owner: {
          login: 'facebook',
          id: 1,
          avatar_url: 'https://github.com/facebook.png',
          type: 'Organization',
        },
        description: 'A JavaScript library for building user interfaces',
        private: false,
        fork: false,
        created_at: '2013-05-24T16:15:32Z',
        updated_at: '2024-01-15T10:30:00Z',
        pushed_at: '2024-01-15T10:30:00Z',
        size: 1000,
        stargazers_count: 200000,
        watchers_count: 200000,
        language: 'JavaScript',
        has_issues: true,
        has_projects: true,
        has_downloads: true,
        has_wiki: true,
        has_pages: false,
        forks_count: 40000,
        open_issues_count: 100,
        default_branch: 'main',
        license: {
          key: 'mit',
          name: 'MIT License',
          spdx_id: 'MIT',
          url: 'https://api.github.com/licenses/mit',
        },
        topics: ['react', 'javascript', 'library'],
        visibility: 'public',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockRepoResponse,
      } as unknown as Response);

      const metadata = await service.getRepositoryMetadata('facebook', 'react');

      expect(metadata).toEqual({
        owner: 'facebook',
        name: 'react',
        fullName: 'facebook/react',
        url: 'https://github.com/facebook/react',
        description: 'A JavaScript library for building user interfaces',
        defaultBranch: 'main',
        stars: 200000,
        forks: 40000,
        primaryLanguage: 'JavaScript',
        size: 1000,
        createdAt: new Date('2013-05-24T16:15:32Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
        pushedAt: new Date('2024-01-15T10:30:00Z'),
        visibility: 'public',
        isArchived: false,
      });
    });

    it('should handle missing description', async () => {
      const mockRepoResponse = {
        id: 1,
        name: 'test-repo',
        full_name: 'owner/test-repo',
        owner: {
          login: 'owner',
          id: 1,
          avatar_url: 'https://github.com/owner.png',
          type: 'User',
        },
        description: null,
        private: false,
        fork: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        pushed_at: '2023-01-01T00:00:00Z',
        size: 100,
        stargazers_count: 10,
        watchers_count: 10,
        language: null,
        has_issues: true,
        has_projects: true,
        has_downloads: true,
        has_wiki: true,
        has_pages: false,
        forks_count: 5,
        open_issues_count: 0,
        default_branch: 'main',
        license: null,
        topics: [],
        visibility: 'public',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockRepoResponse,
      } as unknown as Response);

      const metadata = await service.getRepositoryMetadata('owner', 'test-repo');

      expect(metadata.description).toBeNull();
      expect(metadata.primaryLanguage).toBeNull();
    });

    it('should throw GitHubRepositoryNotFoundError for 404', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers(),
        json: async () => ({ message: 'Not Found' }),
      } as unknown as Response);

      await expect(service.getRepositoryMetadata('nonexistent', 'repo')).rejects.toThrow(
        GitHubRepositoryNotFoundError
      );
    });

    it('should handle GitHub API failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: async () => ({ message: 'Internal Server Error' }),
      } as unknown as Response);

      await expect(service.getRepositoryMetadata('owner', 'repo')).rejects.toThrow(GitHubApiError);
    });
  });

  describe('getRepositoryTree', () => {
    it('should retrieve repository tree successfully', async () => {
      const mockTreeResponse = {
        sha: 'abc123',
        url: 'https://api.github.com/repos/owner/repo/git/trees/abc123',
        tree: [
          {
            path: 'src/index.ts',
            mode: '100644',
            type: 'blob',
            sha: 'def456',
            size: 1024,
            url: 'https://api.github.com/repos/owner/repo/git/blobs/def456',
          },
          {
            path: 'src/utils',
            mode: '040000',
            type: 'tree',
            sha: 'ghi789',
            url: 'https://api.github.com/repos/owner/repo/git/trees/ghi789',
          },
        ],
        truncated: false,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockTreeResponse,
      } as unknown as Response);

      const tree = await service.getRepositoryTree('owner', 'repo');

      expect(tree).toHaveLength(2);
      expect(tree[0]).toEqual({
        path: 'src/index.ts',
        type: 'file',
        sha: 'def456',
        size: 1024,
      });
      expect(tree[1]).toEqual({
        path: 'src/utils',
        type: 'directory',
        sha: 'ghi789',
        size: undefined,
      });
    });

    it('should use default branch when no sha provided', async () => {
      const mockTreeResponse = {
        sha: 'abc123',
        url: 'https://api.github.com/repos/owner/repo/git/trees/abc123',
        tree: [],
        truncated: false,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockTreeResponse,
      } as unknown as Response);

      await service.getRepositoryTree('owner', 'repo');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/repos/owner/repo/git/trees/HEAD?recursive=1'),
        expect.any(Object)
      );
    });

    it('should use explicit branch when sha provided', async () => {
      const mockTreeResponse = {
        sha: 'abc123',
        url: 'https://api.github.com/repos/owner/repo/git/trees/abc123',
        tree: [],
        truncated: false,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockTreeResponse,
      } as unknown as Response);

      await service.getRepositoryTree('owner', 'repo', 'develop');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/repos/owner/repo/git/trees/develop?recursive=1'),
        expect.any(Object)
      );
    });

    it('should throw GitHubTreeTruncatedError for truncated tree', async () => {
      const mockTreeResponse = {
        sha: 'abc123',
        url: 'https://api.github.com/repos/owner/repo/git/trees/abc123',
        tree: [],
        truncated: true,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockTreeResponse,
      } as unknown as Response);

      await expect(service.getRepositoryTree('owner', 'repo')).rejects.toThrow(
        GitHubTreeTruncatedError
      );
    });

    it('should throw GitHubRepositoryNotFoundError for 404', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers(),
        json: async () => ({ message: 'Not Found' }),
      } as unknown as Response);

      await expect(service.getRepositoryTree('nonexistent', 'repo')).rejects.toThrow(
        GitHubRepositoryNotFoundError
      );
    });

    it('should handle GitHub API failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: async () => ({ message: 'Internal Server Error' }),
      } as unknown as Response);

      await expect(service.getRepositoryTree('owner', 'repo')).rejects.toThrow(GitHubApiError);
    });
  });

  describe('getFileContent', () => {
    it('should retrieve file content successfully', async () => {
      const testContent = 'console.log("Hello, World!");';
      const mockFileResponse = {
        name: 'index.ts',
        path: 'src/index.ts',
        sha: 'abc123',
        size: 1024,
        url: 'https://api.github.com/repos/owner/repo/contents/src/index.ts',
        html_url: 'https://github.com/owner/repo/blob/main/src/index.ts',
        git_url: 'https://api.github.com/repos/owner/repo/git/blobs/abc123',
        download_url: 'https://raw.githubusercontent.com/owner/repo/main/src/index.ts',
        type: 'file',
        content: Buffer.from(testContent).toString('base64'),
        encoding: 'base64',
        _links: {
          self: 'https://api.github.com/repos/owner/repo/contents/src/index.ts',
          git: 'https://api.github.com/repos/owner/repo/git/blobs/abc123',
          html: 'https://github.com/owner/repo/blob/main/src/index.ts',
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockFileResponse,
      } as unknown as Response);

      const fileContent = await service.getFileContent('owner', 'repo', 'src/index.ts');

      expect(fileContent).toEqual({
        path: 'src/index.ts',
        content: testContent,
        sha: 'abc123',
        size: 1024,
        encoding: 'base64',
      });
    });

    it('should use explicit ref when provided', async () => {
      const mockFileResponse = {
        name: 'index.ts',
        path: 'src/index.ts',
        sha: 'abc123',
        size: 1024,
        url: 'https://api.github.com/repos/owner/repo/contents/src/index.ts',
        html_url: 'https://github.com/owner/repo/blob/main/src/index.ts',
        git_url: 'https://api.github.com/repos/owner/repo/git/blobs/abc123',
        download_url: 'https://raw.githubusercontent.com/owner/repo/main/src/index.ts',
        type: 'file',
        content: Buffer.from('test').toString('base64'),
        encoding: 'base64',
        _links: {
          self: 'https://api.github.com/repos/owner/repo/contents/src/index.ts',
          git: 'https://api.github.com/repos/owner/repo/git/blobs/abc123',
          html: 'https://github.com/owner/repo/blob/main/src/index.ts',
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockFileResponse,
      } as unknown as Response);

      await service.getFileContent('owner', 'repo', 'src/index.ts', 'develop');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('?ref=develop'),
        expect.any(Object)
      );
    });

    it('should throw GitHubBinaryFileError for directory', async () => {
      const mockFileResponse = {
        name: 'src',
        path: 'src',
        sha: 'abc123',
        size: 0,
        url: 'https://api.github.com/repos/owner/repo/contents/src',
        html_url: 'https://github.com/owner/repo/tree/main/src',
        git_url: 'https://api.github.com/repos/owner/repo/git/trees/abc123',
        download_url: null,
        type: 'dir',
        content: '',
        encoding: 'base64',
        _links: {
          self: 'https://api.github.com/repos/owner/repo/contents/src',
          git: 'https://api.github.com/repos/owner/repo/git/trees/abc123',
          html: 'https://github.com/owner/repo/tree/main/src',
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockFileResponse,
      } as unknown as Response);

      await expect(service.getFileContent('owner', 'repo', 'src')).rejects.toThrow(
        GitHubBinaryFileError
      );
    });

    it('should throw GitHubBinaryFileError for unsupported encoding', async () => {
      const mockFileResponse = {
        name: 'image.png',
        path: 'image.png',
        sha: 'abc123',
        size: 1024,
        url: 'https://api.github.com/repos/owner/repo/contents/image.png',
        html_url: 'https://github.com/owner/repo/blob/main/image.png',
        git_url: 'https://api.github.com/repos/owner/repo/git/blobs/abc123',
        download_url: 'https://raw.githubusercontent.com/owner/repo/main/image.png',
        type: 'file',
        content: 'binarydata',
        encoding: 'utf-8',
        _links: {
          self: 'https://api.github.com/repos/owner/repo/contents/image.png',
          git: 'https://api.github.com/repos/owner/repo/git/blobs/abc123',
          html: 'https://github.com/owner/repo/blob/main/image.png',
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockFileResponse,
      } as unknown as Response);

      await expect(service.getFileContent('owner', 'repo', 'image.png')).rejects.toThrow(
        GitHubBinaryFileError
      );
    });

    it('should throw GitHubFileNotFoundError for 404', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers(),
        json: async () => ({ message: 'Not Found' }),
      } as unknown as Response);

      await expect(service.getFileContent('owner', 'repo', 'nonexistent.ts')).rejects.toThrow(
        GitHubFileNotFoundError
      );
    });

    it('should handle GitHub API failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: async () => ({ message: 'Internal Server Error' }),
      } as unknown as Response);

      await expect(service.getFileContent('owner', 'repo', 'test.ts')).rejects.toThrow(GitHubApiError);
    });
  });
});
