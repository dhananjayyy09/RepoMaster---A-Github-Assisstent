import { FileFilterService } from '../file-processing/file-filter.service';
import { LanguageDetectorService } from '../file-processing/language-detector.service';
import { FileNormalizerService } from '../file-processing/file-normalizer.service';
import { detectBinaryContent, normalizePath, extractFileName, extractExtension, isTextFile } from '../file-processing/file-processing.utils';
import { TreeItem, FileContent } from '../github/github.types';
import { BinaryFileError, FileTooLargeError } from '../file-processing/file-processing.errors';

describe('FileFilterService', () => {
  let fileFilter: FileFilterService;

  beforeEach(() => {
    fileFilter = new FileFilterService();
  });

  describe('shouldProcess', () => {
    it('should accept source files', () => {
      const treeItem: TreeItem = {
        path: 'src/index.ts',
        type: 'file',
        sha: 'abc123',
        size: 1000,
      };
      const result = fileFilter.shouldProcess(treeItem);
      expect(result.status).toBe('PROCESSABLE');
    });

    it('should reject directories', () => {
      const treeItem: TreeItem = {
        path: 'src/components',
        type: 'directory',
        sha: 'abc123',
      };
      const result = fileFilter.shouldProcess(treeItem);
      expect(result.status).toBe('UNSUPPORTED');
      expect(result.reason).toBe('Directory');
    });

    it('should reject node_modules', () => {
      const treeItem: TreeItem = {
        path: 'node_modules/package/index.js',
        type: 'file',
        sha: 'abc123',
        size: 1000,
      };
      const result = fileFilter.shouldProcess(treeItem);
      expect(result.status).toBe('UNSUPPORTED');
      expect(result.reason).toBe('In ignored directory');
    });

    it('should reject dist directory', () => {
      const treeItem: TreeItem = {
        path: 'dist/bundle.js',
        type: 'file',
        sha: 'abc123',
        size: 1000,
      };
      const result = fileFilter.shouldProcess(treeItem);
      expect(result.status).toBe('UNSUPPORTED');
      expect(result.reason).toBe('In ignored directory');
    });

    it('should reject build directory', () => {
      const treeItem: TreeItem = {
        path: 'build/output.js',
        type: 'file',
        sha: 'abc123',
        size: 1000,
      };
      const result = fileFilter.shouldProcess(treeItem);
      expect(result.status).toBe('UNSUPPORTED');
      expect(result.reason).toBe('In ignored directory');
    });

    it('should reject vendor directory', () => {
      const treeItem: TreeItem = {
        path: 'vendor/library.js',
        type: 'file',
        sha: 'abc123',
        size: 1000,
      };
      const result = fileFilter.shouldProcess(treeItem);
      expect(result.status).toBe('UNSUPPORTED');
      expect(result.reason).toBe('In ignored directory');
    });

    it('should reject images', () => {
      const treeItem: TreeItem = {
        path: 'assets/logo.png',
        type: 'file',
        sha: 'abc123',
        size: 1000,
      };
      const result = fileFilter.shouldProcess(treeItem);
      expect(result.status).toBe('BINARY');
      expect(result.reason).toBe('Binary file extension');
    });

    it('should reject videos', () => {
      const treeItem: TreeItem = {
        path: 'assets/video.mp4',
        type: 'file',
        sha: 'abc123',
        size: 1000,
      };
      const result = fileFilter.shouldProcess(treeItem);
      expect(result.status).toBe('BINARY');
      expect(result.reason).toBe('Binary file extension');
    });

    it('should reject archives', () => {
      const treeItem: TreeItem = {
        path: 'archive.zip',
        type: 'file',
        sha: 'abc123',
        size: 1000,
      };
      const result = fileFilter.shouldProcess(treeItem);
      expect(result.status).toBe('BINARY');
      expect(result.reason).toBe('Binary file extension');
    });

    it('should reject executables', () => {
      const treeItem: TreeItem = {
        path: 'program.exe',
        type: 'file',
        sha: 'abc123',
        size: 1000,
      };
      const result = fileFilter.shouldProcess(treeItem);
      expect(result.status).toBe('BINARY');
      expect(result.reason).toBe('Binary file extension');
    });

    it('should reject minified files', () => {
      const treeItem: TreeItem = {
        path: 'lib/app.min.js',
        type: 'file',
        sha: 'abc123',
        size: 1000,
      };
      const result = fileFilter.shouldProcess(treeItem);
      expect(result.status).toBe('UNSUPPORTED');
      expect(result.reason).toBe('Minified file');
    });

    it('should reject oversized files', () => {
      const treeItem: TreeItem = {
        path: 'large.ts',
        type: 'file',
        sha: 'abc123',
        size: 2 * 1024 * 1024, // 2MB
      };
      const result = fileFilter.shouldProcess(treeItem);
      expect(result.status).toBe('TOO_LARGE');
      expect(result.reason).toContain('exceeds limit');
    });

    it('should accept files within size limit', () => {
      const treeItem: TreeItem = {
        path: 'small.ts',
        type: 'file',
        sha: 'abc123',
        size: 500 * 1024, // 500KB
      };
      const result = fileFilter.shouldProcess(treeItem);
      expect(result.status).toBe('PROCESSABLE');
    });

    it('should handle unknown extensions', () => {
      const treeItem: TreeItem = {
        path: 'config.xyz',
        type: 'file',
        sha: 'abc123',
        size: 1000,
      };
      const result = fileFilter.shouldProcess(treeItem);
      expect(result.status).toBe('PROCESSABLE');
    });

    it('should accept common config files', () => {
      const treeItem: TreeItem = {
        path: '.env',
        type: 'file',
        sha: 'abc123',
        size: 100,
      };
      const result = fileFilter.shouldProcess(treeItem);
      expect(result.status).toBe('PROCESSABLE');
    });

    it('should accept special files without extensions', () => {
      const treeItem: TreeItem = {
        path: 'Dockerfile',
        type: 'file',
        sha: 'abc123',
        size: 1000,
      };
      const result = fileFilter.shouldProcess(treeItem);
      expect(result.status).toBe('PROCESSABLE');
    });

    it('should reject .git directory', () => {
      const treeItem: TreeItem = {
        path: '.git/config',
        type: 'file',
        sha: 'abc123',
        size: 100,
      };
      const result = fileFilter.shouldProcess(treeItem);
      expect(result.status).toBe('UNSUPPORTED');
      expect(result.reason).toBe('In ignored directory');
    });

    it('should use custom file size when provided', () => {
      const treeItem: TreeItem = {
        path: 'file.js',
        type: 'file',
        sha: 'abc123',
        size: 500 * 1024, // 500KB
      };
      const result = fileFilter.shouldProcess(treeItem, 2 * 1024 * 1024); // 2MB custom size
      expect(result.status).toBe('TOO_LARGE');
    });
  });

  describe('config management', () => {
    it('should return current config', () => {
      const config = fileFilter.getConfig();
      expect(config).toHaveProperty('maxFileSizeBytes');
      expect(config).toHaveProperty('ignoredDirectories');
      expect(config).toHaveProperty('ignoredExtensions');
    });

    it('should update config', () => {
      fileFilter.updateConfig({ maxFileSizeBytes: 2 * 1024 * 1024 });
      const config = fileFilter.getConfig();
      expect(config.maxFileSizeBytes).toBe(2 * 1024 * 1024);
    });
  });
});

describe('LanguageDetectorService', () => {
  let languageDetector: LanguageDetectorService;

  beforeEach(() => {
    languageDetector = new LanguageDetectorService();
  });

  describe('detectLanguage', () => {
    it('should detect JavaScript', () => {
      expect(languageDetector.detectLanguage('app.js')).toBe('JavaScript');
      expect(languageDetector.detectLanguage('app.mjs')).toBe('JavaScript');
      expect(languageDetector.detectLanguage('app.cjs')).toBe('JavaScript');
    });

    it('should detect TypeScript', () => {
      expect(languageDetector.detectLanguage('app.ts')).toBe('TypeScript');
      expect(languageDetector.detectLanguage('app.mts')).toBe('TypeScript');
      expect(languageDetector.detectLanguage('app.cts')).toBe('TypeScript');
    });

    it('should detect JSX', () => {
      expect(languageDetector.detectLanguage('Component.jsx')).toBe('JSX');
    });

    it('should detect TSX', () => {
      expect(languageDetector.detectLanguage('Component.tsx')).toBe('TSX');
    });

    it('should detect Python', () => {
      expect(languageDetector.detectLanguage('script.py')).toBe('Python');
      expect(languageDetector.detectLanguage('script.pyw')).toBe('Python');
      expect(languageDetector.detectLanguage('script.pyi')).toBe('Python');
    });

    it('should detect Java', () => {
      expect(languageDetector.detectLanguage('Main.java')).toBe('Java');
    });

    it('should detect C', () => {
      expect(languageDetector.detectLanguage('main.c')).toBe('C');
      expect(languageDetector.detectLanguage('header.h')).toBe('C');
    });

    it('should detect C++', () => {
      expect(languageDetector.detectLanguage('main.cpp')).toBe('C++');
      expect(languageDetector.detectLanguage('header.hpp')).toBe('C++');
      expect(languageDetector.detectLanguage('main.cc')).toBe('C++');
    });

    it('should detect C#', () => {
      expect(languageDetector.detectLanguage('Program.cs')).toBe('C#');
    });

    it('should detect Go', () => {
      expect(languageDetector.detectLanguage('main.go')).toBe('Go');
    });

    it('should detect Rust', () => {
      expect(languageDetector.detectLanguage('main.rs')).toBe('Rust');
    });

    it('should detect PHP', () => {
      expect(languageDetector.detectLanguage('index.php')).toBe('PHP');
    });

    it('should detect Ruby', () => {
      expect(languageDetector.detectLanguage('script.rb')).toBe('Ruby');
    });

    it('should detect Kotlin', () => {
      expect(languageDetector.detectLanguage('Main.kt')).toBe('Kotlin');
    });

    it('should detect Swift', () => {
      expect(languageDetector.detectLanguage('main.swift')).toBe('Swift');
    });

    it('should detect Dart', () => {
      expect(languageDetector.detectLanguage('main.dart')).toBe('Dart');
    });

    it('should detect SQL', () => {
      expect(languageDetector.detectLanguage('query.sql')).toBe('SQL');
    });

    it('should detect HTML', () => {
      expect(languageDetector.detectLanguage('index.html')).toBe('HTML');
      expect(languageDetector.detectLanguage('index.htm')).toBe('HTML');
    });

    it('should detect CSS', () => {
      expect(languageDetector.detectLanguage('style.css')).toBe('CSS');
    });

    it('should detect SCSS', () => {
      expect(languageDetector.detectLanguage('style.scss')).toBe('SCSS');
    });

    it('should detect JSON', () => {
      expect(languageDetector.detectLanguage('data.json')).toBe('JSON');
    });

    it('should detect YAML', () => {
      expect(languageDetector.detectLanguage('config.yaml')).toBe('YAML');
      expect(languageDetector.detectLanguage('config.yml')).toBe('YAML');
    });

    it('should detect XML', () => {
      expect(languageDetector.detectLanguage('data.xml')).toBe('XML');
    });

    it('should detect Markdown', () => {
      expect(languageDetector.detectLanguage('README.md')).toBe('Markdown');
    });

    it('should detect Shell', () => {
      expect(languageDetector.detectLanguage('script.sh')).toBe('Shell');
      expect(languageDetector.detectLanguage('script.bash')).toBe('Shell');
    });

    it('should detect Dockerfile', () => {
      expect(languageDetector.detectLanguage('Dockerfile')).toBe('Dockerfile');
      expect(languageDetector.detectLanguage('dockerfile')).toBe('Dockerfile');
    });

    it('should detect Makefile', () => {
      expect(languageDetector.detectLanguage('Makefile')).toBe('Makefile');
      expect(languageDetector.detectLanguage('makefile')).toBe('Makefile');
    });

    it('should detect special config files', () => {
      expect(languageDetector.detectLanguage('package.json')).toBe('JSON');
      expect(languageDetector.detectLanguage('tsconfig.json')).toBe('JSON');
      expect(languageDetector.detectLanguage('requirements.txt')).toBe('Python');
      expect(languageDetector.detectLanguage('docker-compose.yml')).toBe('YAML');
    });

    it('should return Unknown for unknown extensions', () => {
      expect(languageDetector.detectLanguage('file.xyz')).toBe('Unknown');
      expect(languageDetector.detectLanguage('file.unknown')).toBe('Unknown');
    });

    it('should handle files without extensions', () => {
      expect(languageDetector.detectLanguage('LICENSE')).toBe('Unknown');
      expect(languageDetector.detectLanguage('README')).toBe('Unknown');
    });

    it('should be case insensitive', () => {
      expect(languageDetector.detectLanguage('APP.JS')).toBe('JavaScript');
      expect(languageDetector.detectLanguage('APP.TS')).toBe('TypeScript');
      expect(languageDetector.detectLanguage('DOCKERFILE')).toBe('Dockerfile');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return array of supported languages', () => {
      const languages = languageDetector.getSupportedLanguages();
      expect(Array.isArray(languages)).toBe(true);
      expect(languages.length).toBeGreaterThan(0);
      expect(languages).toContain('JavaScript');
      expect(languages).toContain('Python');
    });
  });

  describe('isLanguageSupported', () => {
    it('should return true for known languages', () => {
      expect(languageDetector.isLanguageSupported('JavaScript')).toBe(true);
      expect(languageDetector.isLanguageSupported('Python')).toBe(true);
    });

    it('should return false for Unknown', () => {
      expect(languageDetector.isLanguageSupported('Unknown')).toBe(false);
    });
  });
});

describe('FileProcessingUtils', () => {
  describe('detectBinaryContent', () => {
    it('should detect null bytes', () => {
      const binaryContent = 'text\x00more';
      expect(detectBinaryContent(binaryContent)).toBe(true);
    });

    it('should detect high ratio of non-printable characters', () => {
      const binaryContent = '\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f';
      expect(detectBinaryContent(binaryContent)).toBe(true);
    });

    it('should accept normal text', () => {
      const textContent = 'function hello() { return "world"; }';
      expect(detectBinaryContent(textContent)).toBe(false);
    });

    it('should accept text with newlines and tabs', () => {
      const textContent = 'line1\nline2\ttabbed';
      expect(detectBinaryContent(textContent)).toBe(false);
    });

    it('should accept mixed printable content', () => {
      const textContent = 'const x = 1;\nconst y = 2;';
      expect(detectBinaryContent(textContent)).toBe(false);
    });
  });

  describe('normalizePath', () => {
    it('should convert backslashes to forward slashes', () => {
      expect(normalizePath('src\\components\\App.tsx')).toBe('src/components/App.tsx');
    });

    it('should keep forward slashes unchanged', () => {
      expect(normalizePath('src/components/App.tsx')).toBe('src/components/App.tsx');
    });

    it('should handle mixed slashes', () => {
      expect(normalizePath('src\\components/App.tsx')).toBe('src/components/App.tsx');
    });
  });

  describe('extractFileName', () => {
    it('should extract filename from path', () => {
      expect(extractFileName('src/components/App.tsx')).toBe('App.tsx');
    });

    it('should handle filename without path', () => {
      expect(extractFileName('App.tsx')).toBe('App.tsx');
    });

    it('should handle nested paths', () => {
      expect(extractFileName('src/utils/helpers/string.util.ts')).toBe('string.util.ts');
    });
  });

  describe('extractExtension', () => {
    it('should extract extension from filename', () => {
      expect(extractExtension('App.tsx')).toBe('.tsx');
    });

    it('should return empty string for no extension', () => {
      expect(extractExtension('Dockerfile')).toBe('');
      expect(extractExtension('Makefile')).toBe('');
    });

    it('should handle multiple dots', () => {
      expect(extractExtension('app.min.js')).toBe('.js');
    });

    it('should handle dot at start', () => {
      expect(extractExtension('.env')).toBe(''); // .env is a hidden file, not an extension
    });
  });

  describe('isTextFile', () => {
    it('should return true for text content', () => {
      expect(isTextFile('function test() {}')).toBe(true);
    });

    it('should return false for binary content', () => {
      expect(isTextFile('text\x00binary')).toBe(false);
    });
  });
});

describe('FileNormalizerService', () => {
  let fileNormalizer: FileNormalizerService;
  let fileFilter: FileFilterService;
  let languageDetector: LanguageDetectorService;

  beforeEach(() => {
    fileFilter = new FileFilterService();
    languageDetector = new LanguageDetectorService();
    fileNormalizer = new FileNormalizerService(fileFilter, languageDetector);
  });

  describe('normalizeFile', () => {
    it('should normalize a valid source file', () => {
      const treeItem: TreeItem = {
        path: 'src/index.ts',
        type: 'file',
        sha: 'abc123',
        size: 100,
      };
      const fileContent: FileContent = {
        path: 'src/index.ts',
        content: 'console.log("hello");',
        sha: 'abc123',
        size: 100,
        encoding: 'utf-8',
      };

      const result = fileNormalizer.normalizeFile(treeItem, fileContent);
      expect(result.path).toBe('src/index.ts');
      expect(result.fileName).toBe('index.ts');
      expect(result.extension).toBe('.ts');
      expect(result.language).toBe('TypeScript');
      expect(result.content).toBe('console.log("hello");');
      expect(result.size).toBe(100);
      expect(result.sha).toBe('abc123');
      expect(result.isProcessable).toBe(true);
    });

    it('should throw FileTooLargeError for oversized files', () => {
      const treeItem: TreeItem = {
        path: 'large.ts',
        type: 'file',
        sha: 'abc123',
        size: 2 * 1024 * 1024,
      };
      const fileContent: FileContent = {
        path: 'large.ts',
        content: 'content',
        sha: 'abc123',
        size: 2 * 1024 * 1024,
        encoding: 'utf-8',
      };

      expect(() => fileNormalizer.normalizeFile(treeItem, fileContent)).toThrow(FileTooLargeError);
    });

    it('should throw BinaryFileError for binary extensions', () => {
      const treeItem: TreeItem = {
        path: 'image.png',
        type: 'file',
        sha: 'abc123',
        size: 1000,
      };
      const fileContent: FileContent = {
        path: 'image.png',
        content: 'fake content',
        sha: 'abc123',
        size: 1000,
        encoding: 'utf-8',
      };

      expect(() => fileNormalizer.normalizeFile(treeItem, fileContent)).toThrow(BinaryFileError);
    });

    it('should throw BinaryFileError for binary content', () => {
      const treeItem: TreeItem = {
        path: 'data.bin',
        type: 'file',
        sha: 'abc123',
        size: 100,
      };
      const fileContent: FileContent = {
        path: 'data.bin',
        content: 'text\x00binary',
        sha: 'abc123',
        size: 100,
        encoding: 'utf-8',
      };

      expect(() => fileNormalizer.normalizeFile(treeItem, fileContent)).toThrow(BinaryFileError);
    });

    it('should normalize paths with backslashes', () => {
      const treeItem: TreeItem = {
        path: 'src\\components\\App.tsx',
        type: 'file',
        sha: 'abc123',
        size: 100,
      };
      const fileContent: FileContent = {
        path: 'src\\components\\App.tsx',
        content: 'export default function App() {}',
        sha: 'abc123',
        size: 100,
        encoding: 'utf-8',
      };

      const result = fileNormalizer.normalizeFile(treeItem, fileContent);
      expect(result.path).toBe('src/components/App.tsx');
    });

    it('should detect language correctly', () => {
      const treeItem: TreeItem = {
        path: 'script.py',
        type: 'file',
        sha: 'abc123',
        size: 100,
      };
      const fileContent: FileContent = {
        path: 'script.py',
        content: 'print("hello")',
        sha: 'abc123',
        size: 100,
        encoding: 'utf-8',
      };

      const result = fileNormalizer.normalizeFile(treeItem, fileContent);
      expect(result.language).toBe('Python');
    });

    it('should handle special files', () => {
      const treeItem: TreeItem = {
        path: 'Dockerfile',
        type: 'file',
        sha: 'abc123',
        size: 100,
      };
      const fileContent: FileContent = {
        path: 'Dockerfile',
        content: 'FROM node:18',
        sha: 'abc123',
        size: 100,
        encoding: 'utf-8',
      };

      const result = fileNormalizer.normalizeFile(treeItem, fileContent);
      expect(result.fileName).toBe('Dockerfile');
      expect(result.extension).toBe('');
      expect(result.language).toBe('Dockerfile');
    });
  });

  describe('normalizeFiles', () => {
    it('should normalize multiple files', () => {
      const treeItems: TreeItem[] = [
        {
          path: 'src/index.ts',
          type: 'file',
          sha: 'abc123',
          size: 100,
        },
        {
          path: 'src/utils.ts',
          type: 'file',
          sha: 'def456',
          size: 200,
        },
      ];
      const fileContents: FileContent[] = [
        {
          path: 'src/index.ts',
          content: 'index content',
          sha: 'abc123',
          size: 100,
          encoding: 'utf-8',
        },
        {
          path: 'src/utils.ts',
          content: 'utils content',
          sha: 'def456',
          size: 200,
          encoding: 'utf-8',
        },
      ];

      const results = fileNormalizer.normalizeFiles(treeItems, fileContents);
      expect(results).toHaveLength(2);
      expect(results[0].path).toBe('src/index.ts');
      expect(results[1].path).toBe('src/utils.ts');
    });

    it('should skip directories', () => {
      const treeItems: TreeItem[] = [
        {
          path: 'src',
          type: 'directory',
          sha: 'abc123',
        },
        {
          path: 'src/index.ts',
          type: 'file',
          sha: 'def456',
          size: 100,
        },
      ];
      const fileContents: FileContent[] = [
        {
          path: 'src/index.ts',
          content: 'content',
          sha: 'def456',
          size: 100,
          encoding: 'utf-8',
        },
      ];

      const results = fileNormalizer.normalizeFiles(treeItems, fileContents);
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('src/index.ts');
    });

    it('should skip files without matching content', () => {
      const treeItems: TreeItem[] = [
        {
          path: 'src/index.ts',
          type: 'file',
          sha: 'abc123',
          size: 100,
        },
        {
          path: 'src/missing.ts',
          type: 'file',
          sha: 'def456',
          size: 200,
        },
      ];
      const fileContents: FileContent[] = [
        {
          path: 'src/index.ts',
          content: 'content',
          sha: 'abc123',
          size: 100,
          encoding: 'utf-8',
        },
      ];

      const results = fileNormalizer.normalizeFiles(treeItems, fileContents);
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('src/index.ts');
    });

    it('should skip files that fail normalization', () => {
      const treeItems: TreeItem[] = [
        {
          path: 'src/index.ts',
          type: 'file',
          sha: 'abc123',
          size: 100,
        },
        {
          path: 'image.png',
          type: 'file',
          sha: 'def456',
          size: 1000,
        },
      ];
      const fileContents: FileContent[] = [
        {
          path: 'src/index.ts',
          content: 'content',
          sha: 'abc123',
          size: 100,
          encoding: 'utf-8',
        },
        {
          path: 'image.png',
          content: 'fake image',
          sha: 'def456',
          size: 1000,
          encoding: 'utf-8',
        },
      ];

      const results = fileNormalizer.normalizeFiles(treeItems, fileContents);
      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('src/index.ts');
    });
  });

  describe('service accessors', () => {
    it('should return file filter service', () => {
      expect(fileNormalizer.getFileFilter()).toBe(fileFilter);
    });

    it('should return language detector service', () => {
      expect(fileNormalizer.getLanguageDetector()).toBe(languageDetector);
    });
  });
});
