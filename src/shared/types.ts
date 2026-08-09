export type RecoveryMode = 'strict' | 'visual' | 'advanced';

export type CaptureSource = 'video' | 'region' | 'upload';

export type ThemeMode = 'dark' | 'light';

export type AIModel = 'gemini-2.5-flash' | 'gemini-2.5-pro';

export type AIProvider = 'gemini';

export interface Settings {
  apiKey: string;
  provider: AIProvider;
  model: AIModel;
  recoveryMode: RecoveryMode;
  theme: ThemeMode;
  autoCopy: boolean;
  showPreviewAfterCapture: boolean;
  fontSize: number;
  wordWrap: boolean;
  minimap: boolean;
}

export interface CaptureEntry {
  id: string;
  code: string;
  language: string;
  confidence: number;
  recoveryMode: RecoveryMode;
  source: CaptureSource;
  timestamp: number;
  thumbnailBase64: string;
  processingTimeMs: number;
}

export interface RecoveredCode {
  code: string;
  language: string;
  confidence: number;
  recoveryMode: RecoveryMode;
  timestamp: number;
  processingTimeMs: number;
  sourceImageBase64?: string;
}

export interface CaptureState {
  isCapturing: boolean;
  isAnalyzing: boolean;
  imageData: string | null;
  recoveredCode: RecoveredCode | null;
  error: string | null;
}

export interface VideoInfo {
  found: boolean;
  width: number;
  height: number;
  currentTime: number;
  src: string;
}
