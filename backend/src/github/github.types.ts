export interface GitHubRateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  resetAt: Date;
}

export interface GitHubRepositoryUrl {
  owner: string;
  repo: string;
  url: string;
}

export interface GitHubResponse<T = unknown> {
  data: T;
  rateLimitInfo?: GitHubRateLimitInfo;
}

export interface GitHubErrorResponse {
  message: string;
  documentation_url?: string;
  errors?: Array<{
    resource: string;
    field: string;
    code: string;
  }>;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    type: string;
  };
  description: string | null;
  private: boolean;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  has_issues: boolean;
  has_projects: boolean;
  has_downloads: boolean;
  has_wiki: boolean;
  has_pages: boolean;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  license: {
    key: string;
    name: string;
    spdx_id: string;
    url: string | null;
  } | null;
  topics: string[];
  visibility: string;
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'tree' | 'blob';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
  truncated: boolean;
}

export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: string;
  content: string;
  encoding: string;
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

// Application-level types (clean interfaces for the rest of the application)
export interface RepositoryMetadata {
  owner: string;
  name: string;
  fullName: string;
  url: string;
  description: string | null;
  defaultBranch: string;
  stars: number;
  forks: number;
  primaryLanguage: string | null;
  size: number;
  createdAt: Date;
  updatedAt: Date;
  pushedAt: Date;
  visibility: string;
  isArchived: boolean;
}

export interface TreeItem {
  path: string;
  type: 'file' | 'directory';
  sha: string;
  size?: number;
}

export interface FileContent {
  path: string;
  content: string;
  sha: string;
  size: number;
  encoding: string;
}
