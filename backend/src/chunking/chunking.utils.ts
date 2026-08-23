import { ChunkingConfig, LineRange } from './chunking.types';

// Simple hash function for deterministic IDs (no external dependencies)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16) + str.length.toString(16);
}

export function splitContentIntoLines(content: string): string[] {
  return content.split('\n');
}

export function createLineRanges(
  totalLines: number,
  maxLines: number,
  overlapLines: number
): LineRange[] {
  const ranges: LineRange[] = [];
  let currentLine = 0;

  while (currentLine < totalLines) {
    const endLine = Math.min(currentLine + maxLines - 1, totalLines - 1);
    ranges.push({
      startLine: currentLine,
      endLine: endLine,
    });

    if (endLine >= totalLines - 1) break;

    currentLine = endLine - overlapLines + 1;
  }

  return ranges;
}

export function extractLinesFromRange(lines: string[], range: LineRange): string[] {
  return lines.slice(range.startLine, range.endLine + 1);
}

export function joinLines(lines: string[]): string {
  return lines.join('\n');
}

export function generateDeterministicChunkId(
  fileSha: string,
  filePath: string,
  chunkIndex: number,
  config: ChunkingConfig
): string {
  const hashInput = `${fileSha}:${filePath}:${chunkIndex}:${config.maxChunkLines}:${config.chunkOverlapLines}`;
  return simpleHash(hashInput);
}

export function trimWhitespace(content: string): string {
  return content.trim();
}

export function removeEmptyLines(lines: string[]): string[] {
  return lines.filter(line => line.trim() !== '');
}

export function isEmptyOrWhitespace(content: string): boolean {
  return content.trim() === '';
}

export function calculateChunkSize(content: string): number {
  // Approximate UTF-8 byte length
  let length = 0;
  for (let i = 0; i < content.length; i++) {
    const charCode = content.charCodeAt(i);
    if (charCode < 0x80) {
      length += 1;
    } else if (charCode < 0x800) {
      length += 2;
    } else if (charCode < 0xD800 || charCode >= 0xE000) {
      length += 3;
    } else {
      // Surrogate pair
      i++;
      length += 4;
    }
  }
  return length;
}

export function validateChunkContent(content: string): boolean {
  if (isEmptyOrWhitespace(content)) {
    return false;
  }
  
  // Basic validation - check for null bytes and extreme length
  if (content.includes('\0')) {
    return false;
  }
  
  if (content.length > 10_000_000) { // 10MB limit as safety check
    return false;
  }
  
  return true;
}

export function detectCodeIndentation(lines: string[]): number {
  if (lines.length === 0) return 0;
  
  const nonEmptyLines = lines.filter(line => line.trim() !== '');
  if (nonEmptyLines.length === 0) return 0;
  
  const indentations = nonEmptyLines
    .map(line => line.match(/^\s*/)?.[0].length || 0)
    .filter(indent => indent > 0);
  
  if (indentations.length === 0) return 0;
  
  // Find the most common indentation
  const indentCounts = new Map<number, number>();
  indentations.forEach(indent => {
    indentCounts.set(indent, (indentCounts.get(indent) || 0) + 1);
  });
  
  let maxCount = 0;
  let commonIndent = 0;
  for (const [indent, count] of indentCounts) {
    if (count > maxCount) {
      maxCount = count;
      commonIndent = indent;
    }
  }
  
  return commonIndent;
}

export function preserveTrailingNewline(content: string): string {
  if (content.endsWith('\n')) {
    return content;
  }
  return content + '\n';
}
