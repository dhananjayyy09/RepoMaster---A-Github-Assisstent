import { ChunkingService } from '../chunking/chunking.service';
import { LineBasedChunkingStrategy } from '../chunking/chunking.strategies';
import {
  splitContentIntoLines,
  createLineRanges,
  generateDeterministicChunkId,
  trimWhitespace,
  validateChunkContent,
  calculateChunkSize,
} from '../chunking/chunking.utils';
import { ProcessedFile } from '../file-processing/file-processing.types';
import { InvalidChunkInputError, ChunkingConfigurationError } from '../chunking/chunking.errors';

describe('Chunking Utils', () => {
  describe('splitContentIntoLines', () => {
    it('should split content into lines', () => {
      const content = 'line1\nline2\nline3';
      const lines = splitContentIntoLines(content);
      expect(lines).toEqual(['line1', 'line2', 'line3']);
    });

    it('should handle single line', () => {
      const content = 'single line';
      const lines = splitContentIntoLines(content);
      expect(lines).toEqual(['single line']);
    });

    it('should handle empty content', () => {
      const content = '';
      const lines = splitContentIntoLines(content);
      expect(lines).toEqual(['']);
    });
  });

  describe('createLineRanges', () => {
    it('should create ranges for small content', () => {
      const ranges = createLineRanges(10, 5, 1);
      expect(ranges).toEqual([
        { startLine: 0, endLine: 4 },
        { startLine: 4, endLine: 8 },
        { startLine: 8, endLine: 9 },
      ]);
    });

    it('should handle single range', () => {
      const ranges = createLineRanges(5, 10, 2);
      expect(ranges).toEqual([
        { startLine: 0, endLine: 4 },
      ]);
    });

    it('should create overlapping ranges', () => {
      const ranges = createLineRanges(20, 10, 3);
      expect(ranges).toEqual([
        { startLine: 0, endLine: 9 },
        { startLine: 7, endLine: 16 },
        { startLine: 14, endLine: 19 },
      ]);
    });

    it('should handle zero overlap', () => {
      const ranges = createLineRanges(15, 5, 0);
      expect(ranges).toEqual([
        { startLine: 0, endLine: 4 },
        { startLine: 5, endLine: 9 },
        { startLine: 10, endLine: 14 },
      ]);
    });
  });

  describe('generateDeterministicChunkId', () => {
    it('should generate same ID for same input', () => {
      const config = { maxChunkLines: 100, chunkOverlapLines: 10 };
      const id1 = generateDeterministicChunkId('abc123', 'src/file.ts', 0, config);
      const id2 = generateDeterministicChunkId('abc123', 'src/file.ts', 0, config);
      expect(id1).toBe(id2);
    });

    it('should generate different IDs for different chunk indices', () => {
      const config = { maxChunkLines: 100, chunkOverlapLines: 10 };
      const id1 = generateDeterministicChunkId('abc123', 'src/file.ts', 0, config);
      const id2 = generateDeterministicChunkId('abc123', 'src/file.ts', 1, config);
      expect(id1).not.toBe(id2);
    });

    it('should generate different IDs for different file paths', () => {
      const config = { maxChunkLines: 100, chunkOverlapLines: 10 };
      const id1 = generateDeterministicChunkId('abc123', 'src/file1.ts', 0, config);
      const id2 = generateDeterministicChunkId('abc123', 'src/file2.ts', 0, config);
      expect(id1).not.toBe(id2);
    });

    it('should generate different IDs for different file SHAs', () => {
      const config = { maxChunkLines: 100, chunkOverlapLines: 10 };
      const id1 = generateDeterministicChunkId('abc123', 'src/file.ts', 0, config);
      const id2 = generateDeterministicChunkId('def456', 'src/file.ts', 0, config);
      expect(id1).not.toBe(id2);
    });
  });

  describe('trimWhitespace', () => {
    it('should trim leading and trailing whitespace', () => {
      expect(trimWhitespace('  content  ')).toBe('content');
    });

    it('should handle tabs', () => {
      expect(trimWhitespace('\t\tcontent\t\t')).toBe('content');
    });

    it('should handle newlines', () => {
      expect(trimWhitespace('\ncontent\n')).toBe('content');
    });

    it('should preserve internal whitespace', () => {
      expect(trimWhitespace('  content with spaces  ')).toBe('content with spaces');
    });
  });

  describe('validateChunkContent', () => {
    it('should accept valid content', () => {
      expect(validateChunkContent('valid content')).toBe(true);
    });

    it('should reject empty content', () => {
      expect(validateChunkContent('')).toBe(false);
    });

    it('should reject whitespace-only content', () => {
      expect(validateChunkContent('   \n\t  ')).toBe(false);
    });

    it('should reject content with null bytes', () => {
      expect(validateChunkContent('content\x00')).toBe(false);
    });
  });

  describe('calculateChunkSize', () => {
    it('should calculate size for ASCII content', () => {
      expect(calculateChunkSize('hello')).toBe(5);
    });

    it('should calculate size for UTF-8 content', () => {
      expect(calculateChunkSize('hello 世界')).toBe(12); // 5 + 1 + 3 + 3
    });

    it('should handle empty string', () => {
      expect(calculateChunkSize('')).toBe(0);
    });
  });
});

describe('LineBasedChunkingStrategy', () => {
  let strategy: LineBasedChunkingStrategy;

  beforeEach(() => {
    strategy = new LineBasedChunkingStrategy();
  });

  it('should handle all languages', () => {
    expect(strategy.canHandle('TypeScript')).toBe(true);
    expect(strategy.canHandle('Python')).toBe(true);
    expect(strategy.canHandle('Unknown')).toBe(true);
  });

  it('should chunk small file into single chunk', () => {
    const file: ProcessedFile = {
      path: 'test.ts',
      fileName: 'test.ts',
      extension: '.ts',
      language: 'TypeScript',
      content: 'line1\nline2\nline3',
      size: 20,
      sha: 'abc123',
      isProcessable: true,
    };

    const config = { maxChunkLines: 10, chunkOverlapLines: 2 };
    const chunks = strategy.chunk(file, config);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe('line1\nline2\nline3');
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].endLine).toBe(3);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].totalChunks).toBe(1);
  });

  it('should chunk large file into multiple chunks', () => {
    const content = Array.from({ length: 25 }, (_, i) => `line${i + 1}`).join('\n');
    const file: ProcessedFile = {
      path: 'test.ts',
      fileName: 'test.ts',
      extension: '.ts',
      language: 'TypeScript',
      content,
      size: content.length,
      sha: 'abc123',
      isProcessable: true,
    };

    const config = { maxChunkLines: 10, chunkOverlapLines: 2 };
    const chunks = strategy.chunk(file, config);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[chunks.length - 1].chunkIndex).toBe(chunks.length - 1);
  });

  it('should handle empty file', () => {
    const file: ProcessedFile = {
      path: 'test.ts',
      fileName: 'test.ts',
      extension: '.ts',
      language: 'TypeScript',
      content: '',
      size: 0,
      sha: 'abc123',
      isProcessable: true,
    };

    const config = { maxChunkLines: 10, chunkOverlapLines: 2 };
    const chunks = strategy.chunk(file, config);

    expect(chunks).toHaveLength(0);
  });

  it('should skip invalid chunks', () => {
    const file: ProcessedFile = {
      path: 'test.ts',
      fileName: 'test.ts',
      extension: '.ts',
      language: 'TypeScript',
      content: '\n\n\n', // Only whitespace
      size: 3,
      sha: 'abc123',
      isProcessable: true,
    };

    const config = { maxChunkLines: 10, chunkOverlapLines: 2 };
    const chunks = strategy.chunk(file, config);

    expect(chunks).toHaveLength(0);
  });
});

describe('ChunkingService', () => {
  let chunkingService: ChunkingService;

  beforeEach(() => {
    chunkingService = new ChunkingService();
  });

  describe('chunkFile', () => {
    it('should chunk TypeScript file using code-aware strategy', () => {
      const file: ProcessedFile = {
        path: 'src/app.ts',
        fileName: 'app.ts',
        extension: '.ts',
        language: 'TypeScript',
        content: 'import { Component } from "react";\n\nexport class App extends Component {\n  render() {\n    return <div>Hello</div>;\n  }\n}',
        size: 120,
        sha: 'abc123',
        isProcessable: true,
      };

      const chunks = chunkingService.chunkFile(file);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].filePath).toBe('src/app.ts');
      expect(chunks[0].fileName).toBe('app.ts');
      expect(chunks[0].language).toBe('TypeScript');
      expect(chunks[0].fileSha).toBe('abc123');
    });

    it('should chunk Markdown file using markdown strategy', () => {
      const file: ProcessedFile = {
        path: 'README.md',
        fileName: 'README.md',
        extension: '.md',
        language: 'Markdown',
        content: '# Introduction\n\nThis is a test.\n\n## Usage\n\nUse it like this.',
        size: 60,
        sha: 'def456',
        isProcessable: true,
      };

      const chunks = chunkingService.chunkFile(file);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].language).toBe('Markdown');
    });

    it('should chunk unknown language using line-based fallback', () => {
      const file: ProcessedFile = {
        path: 'config.xyz',
        fileName: 'config.xyz',
        extension: '.xyz',
        language: 'Unknown',
        content: 'line1\nline2\nline3',
        size: 20,
        sha: 'ghi789',
        isProcessable: true,
      };

      const chunks = chunkingService.chunkFile(file);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].chunkType).toBe('FALLBACK');
    });

    it('should throw error for invalid input', () => {
      const invalidFile = {} as ProcessedFile;

      expect(() => chunkingService.chunkFile(invalidFile)).toThrow(InvalidChunkInputError);
    });

    it('should throw error for empty file', () => {
      const file: ProcessedFile = {
        path: 'test.ts',
        fileName: 'test.ts',
        extension: '.ts',
        language: 'TypeScript',
        content: '',
        size: 0,
        sha: 'abc123',
        isProcessable: true,
      };

      expect(() => chunkingService.chunkFile(file)).toThrow(InvalidChunkInputError);
    });

    it('should use custom config when provided', () => {
      const file: ProcessedFile = {
        path: 'test.ts',
        fileName: 'test.ts',
        extension: '.ts',
        language: 'TypeScript',
        content: Array.from({ length: 50 }, (_, i) => `line${i + 1}`).join('\n'),
        size: 300,
        sha: 'abc123',
        isProcessable: true,
      };

      const chunksDefault = chunkingService.chunkFile(file);
      const chunksCustom = chunkingService.chunkFile(file, { maxChunkLines: 5, chunkOverlapLines: 1 });

      expect(chunksCustom.length).toBeGreaterThan(chunksDefault.length);
    });

    it('should produce deterministic chunk IDs', () => {
      const file: ProcessedFile = {
        path: 'test.ts',
        fileName: 'test.ts',
        extension: '.ts',
        language: 'TypeScript',
        content: 'line1\nline2\nline3',
        size: 20,
        sha: 'abc123',
        isProcessable: true,
      };

      const chunks1 = chunkingService.chunkFile(file);
      const chunks2 = chunkingService.chunkFile(file);

      expect(chunks1[0].id).toBe(chunks2[0].id);
    });
  });

  describe('chunkFiles', () => {
    it('should chunk multiple files', () => {
      const files: ProcessedFile[] = [
        {
          path: 'file1.ts',
          fileName: 'file1.ts',
          extension: '.ts',
          language: 'TypeScript',
          content: 'content1',
          size: 8,
          sha: 'abc123',
          isProcessable: true,
        },
        {
          path: 'file2.ts',
          fileName: 'file2.ts',
          extension: '.ts',
          language: 'TypeScript',
          content: 'content2',
          size: 8,
          sha: 'def456',
          isProcessable: true,
        },
      ];

      const chunks = chunkingService.chunkFiles(files);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.some(c => c.filePath === 'file1.ts')).toBe(true);
      expect(chunks.some(c => c.filePath === 'file2.ts')).toBe(true);
    });

    it('should skip files that fail chunking', () => {
      const files: ProcessedFile[] = [
        {
          path: 'valid.ts',
          fileName: 'valid.ts',
          extension: '.ts',
          language: 'TypeScript',
          content: 'valid content',
          size: 13,
          sha: 'abc123',
          isProcessable: true,
        },
        {
          path: 'invalid.ts',
          fileName: 'invalid.ts',
          extension: '.ts',
          language: 'TypeScript',
          content: '',
          size: 0,
          sha: 'def456',
          isProcessable: true,
        },
      ];

      const chunks = chunkingService.chunkFiles(files);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.every(c => c.filePath === 'valid.ts')).toBe(true);
    });
  });

  describe('configuration validation', () => {
    it('should throw error for invalid maxChunkLines', () => {
      expect(() => new ChunkingService({ maxChunkLines: 0 })).toThrow(ChunkingConfigurationError);
    });

    it('should throw error for negative chunkOverlapLines', () => {
      expect(() => new ChunkingService({ chunkOverlapLines: -1 })).toThrow(ChunkingConfigurationError);
    });

    it('should throw error when overlap >= max', () => {
      expect(() => new ChunkingService({ maxChunkLines: 10, chunkOverlapLines: 10 })).toThrow(ChunkingConfigurationError);
    });
  });

  describe('strategy selection', () => {
    it('should return available strategies', () => {
      const strategies = chunkingService.getAvailableStrategies();
      expect(strategies).toContain('Markdown');
      expect(strategies).toContain('CodeAware');
      expect(strategies).toContain('LineBased');
    });

    it('should return default config', () => {
      const config = chunkingService.getDefaultConfig();
      expect(config).toHaveProperty('maxChunkLines');
      expect(config).toHaveProperty('chunkOverlapLines');
      expect(config.maxChunkLines).toBeGreaterThan(0);
    });
  });
});

describe('Code-Aware Chunking', () => {
  let chunkingService: ChunkingService;

  beforeEach(() => {
    chunkingService = new ChunkingService();
  });

  it('should detect import blocks in TypeScript', () => {
    const file: ProcessedFile = {
      path: 'test.ts',
      fileName: 'test.ts',
      extension: '.ts',
      language: 'TypeScript',
      content: 'import { Component } from "react";\nimport { useState } from "react";\n\nconst x = 1;',
      size: 80,
      sha: 'abc123',
      isProcessable: true,
    };

    const chunks = chunkingService.chunkFile(file);
    const importChunk = chunks.find(c => c.chunkType === 'IMPORT');
    expect(importChunk).toBeDefined();
  });

  it('should group consecutive imports into one chunk', () => {
    const file: ProcessedFile = {
      path: 'imports.ts',
      fileName: 'imports.ts',
      extension: '.ts',
      language: 'TypeScript',
      content: 'import a from "a";\nimport b from "b";\n\nconst value = 1;',
      size: 60,
      sha: 'imports-sha',
      isProcessable: true,
    };

    const chunks = chunkingService.chunkFile(file);
    const importChunks = chunks.filter(chunk => chunk.chunkType === 'IMPORT');

    expect(importChunks).toHaveLength(1);
    expect(importChunks[0].content).toContain('import a from "a";');
    expect(importChunks[0].content).toContain('import b from "b";');
  });

  it('should detect function boundaries in Python', () => {
    const file: ProcessedFile = {
      path: 'test.py',
      fileName: 'test.py',
      extension: '.py',
      language: 'Python',
      content: 'def hello():\n    print("world")\n\ndef goodbye():\n    print("bye")',
      size: 60,
      sha: 'abc123',
      isProcessable: true,
    };

    const chunks = chunkingService.chunkFile(file);
    const functionChunks = chunks.filter(c => c.chunkType === 'FUNCTION');
    expect(functionChunks.length).toBeGreaterThan(0);
  });

  it('should detect class boundaries in Java', () => {
    const file: ProcessedFile = {
      path: 'Test.java',
      fileName: 'Test.java',
      extension: '.java',
      language: 'Java',
      content: 'public class Test {\n  public void run() {}\n}\n\nclass Another {}',
      size: 50,
      sha: 'abc123',
      isProcessable: true,
    };

    const chunks = chunkingService.chunkFile(file);
    const classChunks = chunks.filter(c => c.chunkType === 'CLASS');
    expect(classChunks.length).toBeGreaterThan(0);
  });

  it('should classify methods, interfaces, and types', () => {
    const file: ProcessedFile = {
      path: 'structures.ts',
      fileName: 'structures.ts',
      extension: '.ts',
      language: 'TypeScript',
      content: 'class Example {\n  run() {\n    return true;\n  }\n}\ninterface Contract {\n  run(): boolean;\n}\ntype Alias = string;',
      size: 120,
      sha: 'structures-sha',
      isProcessable: true,
    };

    const chunks = chunkingService.chunkFile(file);

    expect(chunks.some(chunk => chunk.chunkType === 'METHOD')).toBe(true);
    expect(chunks.some(chunk => chunk.chunkType === 'INTERFACE')).toBe(true);
    expect(chunks.some(chunk => chunk.chunkType === 'INTERFACE' && chunk.content.includes('type Alias'))).toBe(false);
    expect(chunks.some(chunk => chunk.chunkType === 'TYPE')).toBe(true);
  });

  it('should split oversized functions', () => {
    const longFunction = Array.from({ length: 150 }, (_, i) => `  line${i + 1};`).join('\n');
    const file: ProcessedFile = {
      path: 'test.ts',
      fileName: 'test.ts',
      extension: '.ts',
      language: 'TypeScript',
      content: `function largeFunction() {\n${longFunction}\n}`,
      size: longFunction.length + 30,
      sha: 'abc123',
      isProcessable: true,
    };

    const chunks = chunkingService.chunkFile(file, { maxChunkLines: 50, chunkOverlapLines: 5 });
    expect(chunks.length).toBeGreaterThan(1);
  });

  it.each([
    ['C++', 'main.cpp', '#include <iostream>\nint main() {\n  return 0;\n}'],
    ['Go', 'main.go', 'package main\n\nfunc main() {\n}'],
    ['Rust', 'main.rs', 'fn main() {\n}'],
  ] as const)('should route %s through code-aware chunking', (language, path, content) => {
    const file: ProcessedFile = {
      path,
      fileName: path,
      extension: `.${path.split('.').pop()}`,
      language,
      content,
      size: content.length,
      sha: `${language}-sha`,
      isProcessable: true,
    };

    const chunks = chunkingService.chunkFile(file);

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every(chunk => chunk.language === language)).toBe(true);
    expect(chunks.some(chunk => chunk.chunkType !== 'FALLBACK')).toBe(true);
  });
});

describe('Markdown Chunking', () => {
  let chunkingService: ChunkingService;

  beforeEach(() => {
    chunkingService = new ChunkingService();
  });

  it('should detect heading boundaries', () => {
    const file: ProcessedFile = {
      path: 'README.md',
      fileName: 'README.md',
      extension: '.md',
      language: 'Markdown',
      content: '# Introduction\n\nContent here.\n\n## Usage\n\nMore content.',
      size: 60,
      sha: 'abc123',
      isProcessable: true,
    };

    const chunks = chunkingService.chunkFile(file);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].chunkType).toBe('DOCUMENTATION');
  });

  it('should detect code blocks', () => {
    const file: ProcessedFile = {
      path: 'README.md',
      fileName: 'README.md',
      extension: '.md',
      language: 'Markdown',
      content: '# Title\n\n```javascript\nconst x = 1;\n```\n\nText after.',
      size: 50,
      sha: 'abc123',
      isProcessable: true,
    };

    const chunks = chunkingService.chunkFile(file);
    const codeChunk = chunks.find(c => c.chunkType === 'CODE');
    expect(codeChunk).toBeDefined();
  });

  it('should keep heading with content', () => {
    const file: ProcessedFile = {
      path: 'README.md',
      fileName: 'README.md',
      extension: '.md',
      language: 'Markdown',
      content: '# Title\n\nThis is the content under the title.',
      size: 50,
      sha: 'abc123',
      isProcessable: true,
    };

    const chunks = chunkingService.chunkFile(file);
    expect(chunks[0].content).toContain('# Title');
    expect(chunks[0].content).toContain('This is the content');
  });
});

describe('Chunk Metadata', () => {
  let chunkingService: ChunkingService;

  beforeEach(() => {
    chunkingService = new ChunkingService();
  });

  it('should preserve file path', () => {
    const file: ProcessedFile = {
      path: 'src/components/Button.tsx',
      fileName: 'Button.tsx',
      extension: '.tsx',
      language: 'TSX',
      content: 'export const Button = () => <button>Click</button>;',
      size: 50,
      sha: 'abc123',
      isProcessable: true,
    };

    const chunks = chunkingService.chunkFile(file);
    expect(chunks[0].filePath).toBe('src/components/Button.tsx');
  });

  it('should preserve file name', () => {
    const file: ProcessedFile = {
      path: 'src/utils/helper.ts',
      fileName: 'helper.ts',
      extension: '.ts',
      language: 'TypeScript',
      content: 'export const helper = () => {};',
      size: 35,
      sha: 'abc123',
      isProcessable: true,
    };

    const chunks = chunkingService.chunkFile(file);
    expect(chunks[0].fileName).toBe('helper.ts');
  });

  it('should preserve language', () => {
    const file: ProcessedFile = {
      path: 'script.py',
      fileName: 'script.py',
      extension: '.py',
      language: 'Python',
      content: 'print("hello")',
      size: 16,
      sha: 'abc123',
      isProcessable: true,
    };

    const chunks = chunkingService.chunkFile(file);
    expect(chunks[0].language).toBe('Python');
  });

  it('should preserve file SHA', () => {
    const file: ProcessedFile = {
      path: 'test.ts',
      fileName: 'test.ts',
      extension: '.ts',
      language: 'TypeScript',
      content: 'const x = 1;',
      size: 12,
      sha: 'test-sha-123',
      isProcessable: true,
    };

    const chunks = chunkingService.chunkFile(file);
    expect(chunks[0].fileSha).toBe('test-sha-123');
  });

  it('should set correct line numbers', () => {
    const file: ProcessedFile = {
      path: 'test.ts',
      fileName: 'test.ts',
      extension: '.ts',
      language: 'TypeScript',
      content: 'line1\nline2\nline3',
      size: 20,
      sha: 'abc123',
      isProcessable: true,
    };

    const chunks = chunkingService.chunkFile(file);
    expect(chunks[0].startLine).toBe(1);
    expect(chunks[0].endLine).toBe(3);
  });

  it('should set correct chunk index and total', () => {
    const content = Array.from({ length: 25 }, (_, i) => `line${i + 1}`).join('\n');
    const file: ProcessedFile = {
      path: 'test.ts',
      fileName: 'test.ts',
      extension: '.ts',
      language: 'TypeScript',
      content,
      size: content.length,
      sha: 'abc123',
      isProcessable: true,
    };

    const chunks = chunkingService.chunkFile(file, { maxChunkLines: 10, chunkOverlapLines: 2 });
    
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[chunks.length - 1].chunkIndex).toBe(chunks.length - 1);
    chunks.forEach(chunk => {
      expect(chunk.totalChunks).toBe(chunks.length);
    });
  });

  it('should calculate chunk size', () => {
    const file: ProcessedFile = {
      path: 'test.ts',
      fileName: 'test.ts',
      extension: '.ts',
      language: 'TypeScript',
      content: 'const x = 1;',
      size: 12,
      sha: 'abc123',
      isProcessable: true,
    };

    const chunks = chunkingService.chunkFile(file);
    expect(chunks[0].size).toBeGreaterThan(0);
  });
});

describe('Configuration and Document Fallback Chunking', () => {
  let chunkingService: ChunkingService;

  beforeEach(() => {
    chunkingService = new ChunkingService();
  });

  it.each([
    ['JSON', 'package.json', '{\n  "name": "repomaster"\n}'],
    ['YAML', 'config.yaml', 'services:\n  api:\n    port: 3000'],
    ['Dockerfile', 'Dockerfile', 'FROM node:20\nWORKDIR /app'],
    ['Makefile', 'Makefile', 'build:\n\t@echo build'],
  ] as const)('should route %s through fallback chunking', (language, path, content) => {
    const file: ProcessedFile = {
      path,
      fileName: path,
      extension: path.includes('.') ? `.${path.split('.').pop()}` : '',
      language,
      content,
      size: content.length,
      sha: `${language}-sha`,
      isProcessable: true,
    };

    const chunks = chunkingService.chunkFile(file);

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every(chunk => chunk.language === language)).toBe(true);
    expect(chunks.every(chunk => chunk.chunkType === 'FALLBACK')).toBe(true);
    expect(chunks[0].content).toContain(content.split('\n')[0]);
  });
});

describe('Edge Cases', () => {
  let chunkingService: ChunkingService;

  beforeEach(() => {
    chunkingService = new ChunkingService();
  });

  it('should handle very long lines', () => {
    const longLine = 'a'.repeat(10000);
    const file: ProcessedFile = {
      path: 'test.ts',
      fileName: 'test.ts',
      extension: '.ts',
      language: 'TypeScript',
      content: longLine,
      size: longLine.length,
      sha: 'abc123',
      isProcessable: true,
    };

    const chunks = chunkingService.chunkFile(file);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should handle files with only whitespace', () => {
    const file: ProcessedFile = {
      path: 'test.ts',
      fileName: 'test.ts',
      extension: '.ts',
      language: 'TypeScript',
      content: '   \n   \n   ',
      size: 12,
      sha: 'abc123',
      isProcessable: true,
    };

    expect(() => chunkingService.chunkFile(file)).toThrow(InvalidChunkInputError);
  });

  it('should handle malformed code', () => {
    const file: ProcessedFile = {
      path: 'test.ts',
      fileName: 'test.ts',
      extension: '.ts',
      language: 'TypeScript',
      content: 'function incomplete {',
      size: 20,
      sha: 'abc123',
      isProcessable: true,
    };

    const chunks = chunkingService.chunkFile(file);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should handle mixed line endings', () => {
    const file: ProcessedFile = {
      path: 'test.ts',
      fileName: 'test.ts',
      extension: '.ts',
      language: 'TypeScript',
      content: 'line1\r\nline2\nline3\r\nline4',
      size: 30,
      sha: 'abc123',
      isProcessable: true,
    };

    const chunks = chunkingService.chunkFile(file);
    expect(chunks.length).toBeGreaterThan(0);
  });
});
