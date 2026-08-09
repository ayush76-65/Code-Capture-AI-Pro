import type { RecoveryMode } from '@/shared/types';

export interface RecoveredCodeResult {
  code: string;
  language: string;
  confidence: number;
}

export interface VisionProvider {
  readonly name: string;
  readonly id: string;

  analyzeCodeImage(
    imageBase64: string,
    mimeType: string,
    recoveryMode: RecoveryMode
  ): Promise<RecoveredCodeResult>;

  testConnection(): Promise<boolean>;
}

export interface ProviderConfig {
  provider: 'gemini';
  apiKey: string;
  model: string;
}
