import type { VisionProvider, RecoveredCodeResult } from './types';
import type { RecoveryMode } from '@/shared/types';
import { detectLanguage } from '@/services/language-detector';

/**
 * OCR Fallback provider using Tesseract.js.
 *
 * This is used only when the primary Vision AI provider fails (network error,
 * rate limit, API key issue). The pipeline is:
 *
 *   Image → Tesseract OCR → raw text → heuristic cleanup → RecoveredCode
 *
 * Note: OCR alone cannot reliably reconstruct indentation and nesting,
 * which is why Vision AI is always preferred.
 */
export class OcrFallbackProvider implements VisionProvider {
  readonly name = 'OCR Fallback (Tesseract.js)';
  readonly id = 'ocr-fallback';

  private worker: Tesseract.Worker | null = null;
  private initializing = false;

  async analyzeCodeImage(
    imageBase64: string,
    _mimeType: string,
    _recoveryMode: RecoveryMode
  ): Promise<RecoveredCodeResult> {
    const dataUrl = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/png;base64,${imageBase64}`;

    const worker = await this.getWorker();

    const result = await worker.recognize(dataUrl);
    const rawText = result.data.text;

    if (!rawText || rawText.trim().length === 0) {
      throw new Error(
        'OCR could not extract any text from the image. The image may not contain readable code.'
      );
    }

    const code = this.cleanOcrOutput(rawText);
    const detected = detectLanguage(code);

    return {
      code,
      language: detected.monacoId,
      confidence: Math.max(Math.round(detected.confidence * 0.7), 20),
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getWorker();
      return true;
    } catch {
      return false;
    }
  }

  private async getWorker(): Promise<Tesseract.Worker> {
    if (this.worker) return this.worker;

    if (this.initializing) {
      // Wait for initialization to complete
      while (this.initializing) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (this.worker) return this.worker;
    }

    this.initializing = true;

    try {
      const Tesseract = await import('tesseract.js');
      this.worker = await Tesseract.createWorker('eng', 1, {
        logger: () => {},
      });
      return this.worker;
    } catch (error) {
      throw new Error(
        `Failed to initialize OCR engine: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      this.initializing = false;
    }
  }

  private cleanOcrOutput(text: string): string {
    let cleaned = text;

    // Fix common OCR artifacts in code
    cleaned = cleaned.replace(/\r\n/g, '\n');
    cleaned = cleaned.replace(/\r/g, '\n');

    // Remove trailing whitespace from each line but preserve leading whitespace
    cleaned = cleaned
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n');

    // Remove excessive blank lines (more than 2 consecutive)
    cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

    // Trim start/end
    cleaned = cleaned.trim();

    return cleaned;
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
