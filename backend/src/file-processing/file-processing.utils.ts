export function detectBinaryContent(content: string): boolean {
  // Check for null bytes (strong indicator of binary)
  if (content.includes('\0')) {
    return true;
  }

  // Check for high ratio of non-printable characters
  const nonPrintableCount = content.split('').filter(char => {
    const code = char.charCodeAt(0);
    return code < 32 && code !== 9 && code !== 10 && code !== 13; // Allow tab, newline, carriage return
  }).length;

  const ratio = nonPrintableCount / content.length;
  
  // If more than 30% non-printable, likely binary
  return ratio > 0.3;
}

export function normalizePath(path: string): string {
  // Convert backslashes to forward slashes for consistency
  return path.replace(/\\/g, '/');
}

export function extractFileName(path: string): string {
  const normalizedPath = normalizePath(path);
  return normalizedPath.split('/').pop() || path;
}

export function extractExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return '';
  }
  return fileName.slice(lastDotIndex);
}

export function isTextFile(content: string): boolean {
  return !detectBinaryContent(content);
}
