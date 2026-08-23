import { ProgrammingLanguage } from './file-processing.types';

const LANGUAGE_MAP: Record<string, ProgrammingLanguage> = {
  // JavaScript/TypeScript
  '.js': 'JavaScript',
  '.jsx': 'JSX',
  '.ts': 'TypeScript',
  '.tsx': 'TSX',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.mts': 'TypeScript',
  '.cts': 'TypeScript',

  // Python
  '.py': 'Python',
  '.pyw': 'Python',
  '.pyi': 'Python',

  // Java
  '.java': 'Java',

  // C/C++
  '.c': 'C',
  '.h': 'C',
  '.cpp': 'C++',
  '.hpp': 'C++',
  '.cc': 'C++',
  '.cxx': 'C++',
  '.hxx': 'C++',

  // C#
  '.cs': 'C#',

  // Go
  '.go': 'Go',

  // Rust
  '.rs': 'Rust',

  // PHP
  '.php': 'PHP',
  '.phtml': 'PHP',

  // Ruby
  '.rb': 'Ruby',
  '.rbw': 'Ruby',

  // Kotlin
  '.kt': 'Kotlin',
  '.kts': 'Kotlin',

  // Swift
  '.swift': 'Swift',

  // Dart
  '.dart': 'Dart',

  // SQL
  '.sql': 'SQL',

  // Web
  '.html': 'HTML',
  '.htm': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.sass': 'SCSS',
  '.less': 'CSS',
  '.xml': 'XML',

  // Data/Config
  '.json': 'JSON',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.toml': 'YAML',
  '.ini': 'YAML',
  '.conf': 'YAML',
  '.env': 'YAML',

  // Documentation
  '.md': 'Markdown',
  '.markdown': 'Markdown',
  '.rst': 'Markdown',

  // Shell
  '.sh': 'Shell',
  '.bash': 'Shell',
  '.zsh': 'Shell',
  '.fish': 'Shell',
  '.ps1': 'Shell',
  '.bat': 'Shell',
  '.cmd': 'Shell',

  // Special files
  'dockerfile': 'Dockerfile',
  'makefile': 'Makefile',
  'jenkinsfile': 'Shell',
  'procfile': 'Shell',
  'gemfile': 'Ruby',
  'rakefile': 'Ruby',
  'vagrantfile': 'Ruby',
  'package.json': 'JSON',
  'tsconfig.json': 'JSON',
  'composer.json': 'JSON',
  'cargo.toml': 'YAML',
  'requirements.txt': 'Python',
  'pom.xml': 'XML',
  'build.gradle': 'YAML',
  'docker-compose.yml': 'YAML',
  'docker-compose.yaml': 'YAML',
};

export class LanguageDetectorService {
  detectLanguage(fileName: string): ProgrammingLanguage {
    const normalizedName = fileName.toLowerCase();

    // Check special files first (exact name match)
    if (LANGUAGE_MAP[normalizedName]) {
      return LANGUAGE_MAP[normalizedName];
    }

    // Check extension
    const extension = this.extractExtension(normalizedName);
    if (extension && LANGUAGE_MAP[extension]) {
      return LANGUAGE_MAP[extension];
    }

    return 'Unknown';
  }

  private extractExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === 0) {
      return '';
    }
    return fileName.slice(lastDotIndex);
  }

  getSupportedLanguages(): ProgrammingLanguage[] {
    return Array.from(new Set(Object.values(LANGUAGE_MAP)));
  }

  isLanguageSupported(language: ProgrammingLanguage): boolean {
    return language !== 'Unknown';
  }
}
