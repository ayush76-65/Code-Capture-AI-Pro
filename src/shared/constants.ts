import type { Settings } from './types';

export const APP_NAME = 'Code Capture AI Pro';
export const APP_VERSION = '1.0.0';

export const MAX_HISTORY_SIZE = 50;
export const MAX_IMAGE_SIZE_MB = 10;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export const TOAST_DURATION_MS = 2000;
export const API_TIMEOUT_MS = 30000;

export const SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpg',
  'image/jpeg',
  'image/webp',
] as const;

export const SUPPORTED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'] as const;

export const SUPPORTED_LANGUAGES = [
  { id: 'python', name: 'Python', extensions: ['.py'] },
  { id: 'javascript', name: 'JavaScript', extensions: ['.js', '.jsx'] },
  { id: 'typescript', name: 'TypeScript', extensions: ['.ts', '.tsx'] },
  { id: 'java', name: 'Java', extensions: ['.java'] },
  { id: 'c', name: 'C', extensions: ['.c', '.h'] },
  { id: 'cpp', name: 'C++', extensions: ['.cpp', '.hpp', '.cc'] },
  { id: 'csharp', name: 'C#', extensions: ['.cs'] },
  { id: 'go', name: 'Go', extensions: ['.go'] },
  { id: 'rust', name: 'Rust', extensions: ['.rs'] },
  { id: 'php', name: 'PHP', extensions: ['.php'] },
  { id: 'kotlin', name: 'Kotlin', extensions: ['.kt'] },
  { id: 'swift', name: 'Swift', extensions: ['.swift'] },
  { id: 'dart', name: 'Dart', extensions: ['.dart'] },
  { id: 'ruby', name: 'Ruby', extensions: ['.rb'] },
  { id: 'lua', name: 'Lua', extensions: ['.lua'] },
  { id: 'shell', name: 'Shell', extensions: ['.sh', '.bash'] },
  { id: 'html', name: 'HTML', extensions: ['.html'] },
  { id: 'css', name: 'CSS', extensions: ['.css'] },
  { id: 'sql', name: 'SQL', extensions: ['.sql'] },
  { id: 'yaml', name: 'YAML', extensions: ['.yaml', '.yml'] },
  { id: 'json', name: 'JSON', extensions: ['.json'] },
  { id: 'xml', name: 'XML', extensions: ['.xml'] },
  { id: 'markdown', name: 'Markdown', extensions: ['.md'] },
  { id: 'plaintext', name: 'Plain Text', extensions: ['.txt'] },
] as const;

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  recoveryMode: 'visual',
  theme: 'dark',
  autoCopy: true,
  showPreviewAfterCapture: false,
  fontSize: 14,
  wordWrap: true,
  minimap: false,
};

export const STORAGE_KEYS = {
  SETTINGS: 'codecapture_settings',
  HISTORY: 'codecapture_history',
} as const;

export const RECOVERY_MODE_INFO = {
  strict: {
    label: 'Strict Preservation',
    description: 'Only reconstructs indentation and formatting. No code modifications whatsoever.',
    icon: '🔒',
  },
  visual: {
    label: 'Visual Recovery',
    description: 'Fixes visual typos (l/I/1, O/0) and punctuation. Preserves all logic.',
    icon: '👁️',
  },
  advanced: {
    label: 'Advanced Recovery',
    description: 'Repairs obvious syntax errors and visual artifacts. Never changes business logic.',
    icon: '⚡',
  },
} as const;
