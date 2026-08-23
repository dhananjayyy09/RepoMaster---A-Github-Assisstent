import { TreeItem } from '../github/github.types';
import { FileFilterResult, FileProcessStatus, FileProcessingConfig } from './file-processing.types';

const DEFAULT_CONFIG: FileProcessingConfig = {
  maxFileSizeBytes: 1048576, // 1MB default
  ignoredDirectories: [
    '.git',
    'node_modules',
    'vendor',
    'dist',
    'build',
    'out',
    'target',
    'coverage',
    '.next',
    '.nuxt',
    '.cache',
    '__pycache__',
    '.idea',
    '.vscode',
  ],
  ignoredExtensions: [
    // Images
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.svg',
    '.ico',
    '.bmp',
    // Videos
    '.mp4',
    '.avi',
    '.mov',
    '.wmv',
    '.flv',
    '.webm',
    // Audio
    '.mp3',
    '.wav',
    '.ogg',
    '.flac',
    '.aac',
    // Archives
    '.zip',
    '.tar',
    '.gz',
    '.rar',
    '.7z',
    '.bz2',
    // Executables and binaries
    '.exe',
    '.dll',
    '.so',
    '.dylib',
    '.class',
    '.jar',
    '.war',
    '.bin',
    // Fonts
    '.woff',
    '.woff2',
    '.ttf',
    '.otf',
    '.eot',
    // Other binary
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
  ],
  minifiedPatterns: [
    /\.min\.js$/,
    /\.min\.css$/,
    /\.bundle\.js$/,
    /\.chunk\.js$/,
  ],
};

export class FileFilterService {
  private config: FileProcessingConfig;

  constructor(config?: Partial<FileProcessingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  shouldProcess(treeItem: TreeItem, fileSize?: number): FileFilterResult {
    if (treeItem.type === 'directory') {
      return { status: 'UNSUPPORTED', reason: 'Directory' };
    }

    const path = treeItem.path;
    const fileName = this.extractFileName(path);

    // Check ignored directories
    if (this.isInIgnoredDirectory(path)) {
      return { status: 'UNSUPPORTED', reason: 'In ignored directory' };
    }

    // Check file size
    const size = fileSize ?? treeItem.size;
    if (size !== undefined && size > this.config.maxFileSizeBytes) {
      return { status: 'TOO_LARGE', reason: `File size ${size} exceeds limit ${this.config.maxFileSizeBytes}` };
    }

    // Check ignored extensions
    const extension = this.extractExtension(fileName);
    if (extension && this.config.ignoredExtensions.includes(extension.toLowerCase())) {
      return { status: 'BINARY', reason: 'Binary file extension' };
    }

    // Check minified patterns
    if (this.isMinifiedFile(fileName)) {
      return { status: 'UNSUPPORTED', reason: 'Minified file' };
    }

    return { status: 'PROCESSABLE' };
  }

  private isInIgnoredDirectory(path: string): boolean {
    const pathParts = path.split('/');
    return pathParts.some(part => this.config.ignoredDirectories.includes(part));
  }

  private extractFileName(path: string): string {
    return path.split('/').pop() || path;
  }

  private extractExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === 0) {
      return '';
    }
    return fileName.slice(lastDotIndex);
  }

  private isMinifiedFile(fileName: string): boolean {
    return this.config.minifiedPatterns.some(pattern => pattern.test(fileName));
  }

  getConfig(): FileProcessingConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<FileProcessingConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}
