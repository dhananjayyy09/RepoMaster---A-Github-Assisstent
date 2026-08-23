import { TreeItem, FileContent } from '../github/github.types';

export type FileProcessStatus = 'PROCESSABLE' | 'UNSUPPORTED' | 'BINARY' | 'TOO_LARGE';

export type ProgrammingLanguage =
  | 'JavaScript'
  | 'TypeScript'
  | 'JSX'
  | 'TSX'
  | 'Python'
  | 'Java'
  | 'C'
  | 'C++'
  | 'C#'
  | 'Go'
  | 'Rust'
  | 'PHP'
  | 'Ruby'
  | 'Kotlin'
  | 'Swift'
  | 'Dart'
  | 'SQL'
  | 'HTML'
  | 'CSS'
  | 'SCSS'
  | 'JSON'
  | 'YAML'
  | 'XML'
  | 'Markdown'
  | 'Shell'
  | 'Dockerfile'
  | 'Makefile'
  | 'Unknown';

export interface FileFilterResult {
  status: FileProcessStatus;
  reason?: string;
}

export interface ProcessedFile {
  path: string;
  fileName: string;
  extension: string;
  language: ProgrammingLanguage;
  content: string;
  size: number;
  sha: string;
  isProcessable: boolean;
}

export interface FileProcessingConfig {
  maxFileSizeBytes: number;
  ignoredDirectories: string[];
  ignoredExtensions: string[];
  minifiedPatterns: RegExp[];
}

export interface FileProcessingInput {
  treeItem: TreeItem;
  fileContent?: FileContent;
}
