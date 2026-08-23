import { TreeItem, FileContent } from '../github/github.types';
import { ProcessedFile, FileProcessStatus, ProgrammingLanguage } from './file-processing.types';
import { FileFilterService } from './file-filter.service';
import { LanguageDetectorService } from './language-detector.service';
import { detectBinaryContent, normalizePath, extractFileName, extractExtension } from './file-processing.utils';
import { BinaryFileError, FileTooLargeError } from './file-processing.errors';

export class FileNormalizerService {
  private fileFilter: FileFilterService;
  private languageDetector: LanguageDetectorService;

  constructor(
    fileFilter?: FileFilterService,
    languageDetector?: LanguageDetectorService
  ) {
    this.fileFilter = fileFilter || new FileFilterService();
    this.languageDetector = languageDetector || new LanguageDetectorService();
  }

  normalizeFile(treeItem: TreeItem, fileContent: FileContent): ProcessedFile {
    // Apply file filtering
    const filterResult = this.fileFilter.shouldProcess(treeItem, fileContent.size);
    
    if (filterResult.status === 'TOO_LARGE') {
      throw new FileTooLargeError(filterResult.reason);
    }

    if (filterResult.status === 'BINARY') {
      throw new BinaryFileError(filterResult.reason);
    }

    // Detect binary content for processable files
    if (filterResult.status === 'PROCESSABLE' && detectBinaryContent(fileContent.content)) {
      throw new BinaryFileError('Binary content detected');
    }

    // Extract file information
    const normalizedPath = normalizePath(treeItem.path);
    const fileName = extractFileName(normalizedPath);
    const extension = extractExtension(fileName);
    const language = this.languageDetector.detectLanguage(fileName);

    // Determine if processable
    const isProcessable = filterResult.status === 'PROCESSABLE';

    return {
      path: normalizedPath,
      fileName,
      extension,
      language,
      content: fileContent.content,
      size: fileContent.size,
      sha: fileContent.sha,
      isProcessable,
    };
  }

  normalizeFiles(treeItems: TreeItem[], fileContents: FileContent[]): ProcessedFile[] {
    const fileMap = new Map(fileContents.map(fc => [fc.path, fc]));
    const processedFiles: ProcessedFile[] = [];

    for (const treeItem of treeItems) {
      if (treeItem.type === 'directory') continue;

      const fileContent = fileMap.get(treeItem.path);
      if (!fileContent) continue;

      try {
        const processedFile = this.normalizeFile(treeItem, fileContent);
        processedFiles.push(processedFile);
      } catch (error) {
        // Skip files that fail normalization (binary, too large, etc.)
        continue;
      }
    }

    return processedFiles;
  }

  getFileFilter(): FileFilterService {
    return this.fileFilter;
  }

  getLanguageDetector(): LanguageDetectorService {
    return this.languageDetector;
  }
}
