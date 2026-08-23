import { ProcessedFile, ProgrammingLanguage } from '../file-processing/file-processing.types';
import { ChunkingStrategy, CodeChunk, ChunkingConfig, ChunkType, CodeBlock } from './chunking.types';
import {
  splitContentIntoLines,
  createLineRanges,
  extractLinesFromRange,
  joinLines,
  generateDeterministicChunkId,
  trimWhitespace,
  validateChunkContent,
  calculateChunkSize,
} from './chunking.utils';

export class LineBasedChunkingStrategy implements ChunkingStrategy {
  name = 'LineBased';

  canHandle(language: string): boolean {
    return true; // Fallback strategy for all languages
  }

  chunk(file: ProcessedFile, config: ChunkingConfig): CodeChunk[] {
    const lines = splitContentIntoLines(file.content);
    const ranges = createLineRanges(lines.length, config.maxChunkLines, config.chunkOverlapLines);
    const chunks: CodeChunk[] = [];

    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      const chunkLines = extractLinesFromRange(lines, range);
      const content = joinLines(chunkLines);

      if (!validateChunkContent(content)) {
        continue;
      }

      const chunk: CodeChunk = {
        id: generateDeterministicChunkId(file.sha, file.path, i, config),
        content: trimWhitespace(content),
        filePath: file.path,
        fileName: file.fileName,
        language: file.language,
        startLine: range.startLine + 1, // Convert to 1-based
        endLine: range.endLine + 1,
        chunkIndex: i,
        totalChunks: ranges.length,
        fileSha: file.sha,
        size: calculateChunkSize(content),
        chunkType: 'FALLBACK',
      };

      chunks.push(chunk);
    }

    return chunks;
  }
}

export class CodeAwareChunkingStrategy implements ChunkingStrategy {
  name = 'CodeAware';

  canHandle(language: string): boolean {
    const codeLanguages: ProgrammingLanguage[] = [
      'JavaScript',
      'TypeScript',
      'JSX',
      'TSX',
      'Python',
      'Java',
      'C',
      'C++',
      'C#',
      'Go',
      'Rust',
      'PHP',
      'Ruby',
      'Kotlin',
      'Swift',
      'Dart',
      'Shell',
    ];
    return codeLanguages.includes(language as ProgrammingLanguage);
  }

  chunk(file: ProcessedFile, config: ChunkingConfig): CodeChunk[] {
    const blocks = this.detectCodeBlocks(file.content, file.language);
    
    if (blocks.length === 0) {
      // Fall back to line-based if no blocks detected
      return new LineBasedChunkingStrategy().chunk(file, config);
    }

    const chunks: CodeChunk[] = [];
    let chunkIndex = 0;

    for (const block of blocks) {
      const blockSize = block.endLine - block.startLine + 1;
      
      if (blockSize <= config.maxChunkLines) {
        // Block fits in one chunk
        const content = joinLines(block.lines);
        if (!validateChunkContent(content)) continue;

        chunks.push(this.createChunk(
          file,
          block.lines,
          block.startLine,
          block.endLine,
          chunkIndex++,
          block.chunkType,
          config
        ));
      } else {
        // Block is too large, split it
        const subRanges = createLineRanges(
          block.lines.length,
          config.maxChunkLines,
          config.chunkOverlapLines
        );

        for (const range of subRanges) {
          const subLines = extractLinesFromRange(block.lines, range);
          const content = joinLines(subLines);
          if (!validateChunkContent(content)) continue;

          chunks.push(this.createChunk(
            file,
            subLines,
            block.startLine + range.startLine,
            block.startLine + range.endLine,
            chunkIndex++,
            block.chunkType,
            config
          ));
        }
      }
    }

    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length;
    });

    return chunks;
  }

  private detectCodeBlocks(content: string, language: string): CodeBlock[] {
    const lines = splitContentIntoLines(content);
    const blocks: CodeBlock[] = [];
    let currentBlock: string[] = [];
    let startLine = 0;
    let currentType: ChunkType = 'CODE';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Continue import block
      if (currentType === 'IMPORT' && this.isImportLine(line, language)) {
        currentBlock.push(line);
        continue;
      }

      // Detect import/include blocks
      if (this.isImportLine(line, language)) {
        if (currentBlock.length > 0) {
          blocks.push({
            lines: currentBlock,
            startLine: startLine,
            endLine: i - 1,
            chunkType: currentType,
          });
        }
        currentBlock = [line];
        startLine = i;
        currentType = 'IMPORT';
        continue;
      }

      // End import block
      if (currentType === 'IMPORT' && !this.isImportLine(line, language)) {
        if (currentBlock.length > 0) {
          blocks.push({
            lines: currentBlock,
            startLine: startLine,
            endLine: i - 1,
            chunkType: 'IMPORT',
          });
        }
        currentBlock = [line];
        startLine = i;
        currentType = this.detectLineType(line, language);
        continue;
      }

      // Detect function/class boundaries
      const newType = this.detectLineType(line, language);
      if (newType !== currentType && this.isStructuralBoundary(line, language)) {
        if (currentBlock.length > 0) {
          blocks.push({
            lines: currentBlock,
            startLine: startLine,
            endLine: i - 1,
            chunkType: currentType,
          });
        }
        currentBlock = [line];
        startLine = i;
        currentType = newType;
      } else {
        currentBlock.push(line);
      }
    }

    // Add final block
    if (currentBlock.length > 0) {
      blocks.push({
        lines: currentBlock,
        startLine: startLine,
        endLine: lines.length - 1,
        chunkType: currentType,
      });
    }

    return blocks;
  }

  private isImportLine(line: string, language: string): boolean {
    const trimmed = line.trim();
    const importPatterns = [
      /^import\s/,
      /^require\s*\(/,
      /^#include\s/,
      /^#import\s/,
      /^using\s/,
      /^from\s/,
      /^use\s/,
    ];
    return importPatterns.some(pattern => pattern.test(trimmed));
  }

  private detectLineType(line: string, language: string): ChunkType {
    const trimmed = line.trim();

    // Function detection
    if (/^(function|def|func|fn)\s/.test(trimmed)) {
      return 'FUNCTION';
    }

    // Interface/type declarations
    if (/^(interface)\s/.test(trimmed)) {
      return 'INTERFACE';
    }

    if (/^(type)\s/.test(trimmed)) {
      return 'TYPE';
    }

    // Class detection
    if (/^(class|struct|enum)\s/.test(trimmed)) {
      return 'CLASS';
    }

    // Method detection (inside classes)
    if (/^\s*(public|private|protected|internal)?\s*\w+\s*\([^)]*\)\s*(?:{|=>)/.test(trimmed)) {
      return 'METHOD';
    }

    return 'CODE';
  }

  private isStructuralBoundary(line: string, language: string): boolean {
    const trimmed = line.trim();
    
    // Major structural keywords
    const structuralPatterns = [
      /^(function|def|class|interface|type|struct|enum)\s/,
      /^export\s+(function|class|const|let|var)/,
      /^module\s/,
      /^namespace\s/,
      /^(public|private|protected|internal)?\s*\w+\s*\([^)]*\)\s*(?:\{|=>)/,
    ];

    return structuralPatterns.some(pattern => pattern.test(trimmed));
  }

  private createChunk(
    file: ProcessedFile,
    lines: string[],
    startLine: number,
    endLine: number,
    chunkIndex: number,
    chunkType: ChunkType,
    config: ChunkingConfig
  ): CodeChunk {
    const content = joinLines(lines);
    return {
      id: generateDeterministicChunkId(file.sha, file.path, chunkIndex, config),
      content: trimWhitespace(content),
      filePath: file.path,
      fileName: file.fileName,
      language: file.language,
      startLine: startLine + 1, // Convert to 1-based
      endLine: endLine + 1,
      chunkIndex: chunkIndex,
      totalChunks: 0, // Will be updated later
      fileSha: file.sha,
      size: calculateChunkSize(content),
      chunkType: chunkType,
    };
  }
}

export class MarkdownChunkingStrategy implements ChunkingStrategy {
  name = 'Markdown';

  canHandle(language: string): boolean {
    return language === 'Markdown';
  }

  chunk(file: ProcessedFile, config: ChunkingConfig): CodeChunk[] {
    const lines = splitContentIntoLines(file.content);
    const blocks = this.detectMarkdownBlocks(lines);
    const chunks: CodeChunk[] = [];
    let chunkIndex = 0;

    for (const block of blocks) {
      const blockSize = block.endLine - block.startLine + 1;

      if (blockSize <= config.maxChunkLines) {
        const content = joinLines(block.lines);
        if (!validateChunkContent(content)) continue;

        chunks.push(this.createChunk(
          file,
          block.lines,
          block.startLine,
          block.endLine,
          chunkIndex++,
          block.chunkType,
          config
        ));
      } else {
        // Split large markdown blocks
        const subRanges = createLineRanges(
          block.lines.length,
          config.maxChunkLines,
          config.chunkOverlapLines
        );

        for (const range of subRanges) {
          const subLines = extractLinesFromRange(block.lines, range);
          const content = joinLines(subLines);
          if (!validateChunkContent(content)) continue;

          chunks.push(this.createChunk(
            file,
            subLines,
            block.startLine + range.startLine,
            block.startLine + range.endLine,
            chunkIndex++,
            block.chunkType,
            config
          ));
        }
      }
    }

    // Update total chunks count
    chunks.forEach(chunk => {
      chunk.totalChunks = chunks.length;
    });

    return chunks;
  }

  private detectMarkdownBlocks(lines: string[]): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    let currentBlock: string[] = [];
    let startLine = 0;
    let currentType: ChunkType = 'DOCUMENTATION';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Detect headings
      if (trimmed.startsWith('#')) {
        if (currentBlock.length > 0) {
          blocks.push({
            lines: currentBlock,
            startLine: startLine,
            endLine: i - 1,
            chunkType: currentType,
          });
        }
        currentBlock = [line];
        startLine = i;
        currentType = 'DOCUMENTATION';
        continue;
      }

      // Detect code blocks
      if (trimmed.startsWith('```')) {
        if (currentBlock.length > 0) {
          blocks.push({
            lines: currentBlock,
            startLine: startLine,
            endLine: i - 1,
            chunkType: currentType,
          });
        }
        currentBlock = [line];
        startLine = i;
        currentType = 'CODE';
        continue;
      }

      currentBlock.push(line);
    }

    // Add final block
    if (currentBlock.length > 0) {
      blocks.push({
        lines: currentBlock,
        startLine: startLine,
        endLine: lines.length - 1,
        chunkType: currentType,
      });
    }

    return blocks;
  }

  private createChunk(
    file: ProcessedFile,
    lines: string[],
    startLine: number,
    endLine: number,
    chunkIndex: number,
    chunkType: ChunkType,
    config: ChunkingConfig
  ): CodeChunk {
    const content = joinLines(lines);
    return {
      id: generateDeterministicChunkId(file.sha, file.path, chunkIndex, config),
      content: trimWhitespace(content),
      filePath: file.path,
      fileName: file.fileName,
      language: file.language,
      startLine: startLine + 1,
      endLine: endLine + 1,
      chunkIndex: chunkIndex,
      totalChunks: 0,
      fileSha: file.sha,
      size: calculateChunkSize(content),
      chunkType: chunkType,
    };
  }
}
