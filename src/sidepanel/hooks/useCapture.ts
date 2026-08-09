import { useState, useCallback, useRef } from 'react';
import type { Settings, CaptureState, RecoveredCode } from '@/shared/types';
import { useVisionProvider } from './useVisionProvider';
import { OcrFallbackProvider } from '@/providers/ocr-fallback';
import type { RecoveredCodeResult } from '@/providers/types';
import { historyService } from '@/services/history-service';
import { compressThumbnail, dataUrlToBase64, getMimeType } from '@/services/image-utils';

const initialState: CaptureState = {
  isCapturing: false,
  isAnalyzing: false,
  imageData: null,
  recoveredCode: null,
  error: null,
};

export function useCapture(settings: Settings) {
  const [captureState, setCaptureState] = useState<CaptureState>(initialState);
  const { provider, isConfigured } = useVisionProvider(settings);
  const ocrFallbackRef = useRef<OcrFallbackProvider | null>(null);

  const analyzeImage = useCallback(
    async (
      imageDataUrl: string,
      fromHistory = false,
      preloadedResult?: { code: string; language: string; confidence: number }
    ) => {
      // If preloaded (from history), just set the state
      if (fromHistory && preloadedResult) {
        setCaptureState({
          isCapturing: false,
          isAnalyzing: false,
          imageData: imageDataUrl,
          recoveredCode: {
            code: preloadedResult.code,
            language: preloadedResult.language,
            confidence: preloadedResult.confidence,
            recoveryMode: settings.recoveryMode,
            timestamp: Date.now(),
            processingTimeMs: 0,
          },
          error: null,
        });
        return;
      }

      if (!isConfigured) {
        setCaptureState((prev) => ({
          ...prev,
          error: 'API key not configured. Go to Settings to add your Gemini API key.',
          isAnalyzing: false,
        }));
        return;
      }

      setCaptureState({
        isCapturing: false,
        isAnalyzing: true,
        imageData: imageDataUrl,
        recoveredCode: null,
        error: null,
      });

      const startTime = performance.now();
      const base64 = dataUrlToBase64(imageDataUrl);
      const mimeType = getMimeType(imageDataUrl);

      let result: RecoveredCodeResult | null = null;
      let usedFallback = false;

      // Try primary Vision provider
      try {
        if (provider) {
          result = await provider.analyzeCodeImage(base64, mimeType, settings.recoveryMode);
        }
      } catch (error) {
        console.warn('[Code Capture AI Pro] Vision provider failed, trying OCR fallback:', error);

        // Try OCR fallback
        try {
          if (!ocrFallbackRef.current) {
            ocrFallbackRef.current = new OcrFallbackProvider();
          }
          result = await ocrFallbackRef.current.analyzeCodeImage(
            base64,
            mimeType,
            settings.recoveryMode
          );
          usedFallback = true;
        } catch (ocrError) {
          const primaryMsg = error instanceof Error ? error.message : 'Vision AI failed';
          const ocrMsg = ocrError instanceof Error ? ocrError.message : 'OCR also failed';
          setCaptureState({
            isCapturing: false,
            isAnalyzing: false,
            imageData: imageDataUrl,
            recoveredCode: null,
            error: `${primaryMsg}. Fallback OCR: ${ocrMsg}`,
          });
          return;
        }
      }

      if (!result || !result.code) {
        setCaptureState({
          isCapturing: false,
          isAnalyzing: false,
          imageData: imageDataUrl,
          recoveredCode: null,
          error: 'No code could be extracted from the image. Try a clearer screenshot.',
        });
        return;
      }

      const processingTimeMs = Math.round(performance.now() - startTime);

      const recoveredCode: RecoveredCode = {
        code: result.code,
        language: result.language,
        confidence: usedFallback ? Math.round(result.confidence * 0.7) : result.confidence,
        recoveryMode: settings.recoveryMode,
        timestamp: Date.now(),
        processingTimeMs,
      };

      setCaptureState({
        isCapturing: false,
        isAnalyzing: false,
        imageData: imageDataUrl,
        recoveredCode,
        error: null,
      });

      // Auto copy if enabled
      if (settings.autoCopy && result.code) {
        try {
          await navigator.clipboard.writeText(result.code);
        } catch {
          // Clipboard access may fail in some contexts
        }
      }

      // Save to history
      try {
        const thumbnail = await compressThumbnail(imageDataUrl);
        await historyService.add({
          id: historyService.generateId(),
          code: result.code,
          language: result.language,
          confidence: recoveredCode.confidence,
          recoveryMode: settings.recoveryMode,
          source: 'upload',
          timestamp: Date.now(),
          thumbnailBase64: thumbnail,
          processingTimeMs,
        });
      } catch {
        // History save failure is non-critical
      }
    },
    [provider, isConfigured, settings.recoveryMode, settings.autoCopy]
  );

  const clearState = useCallback(() => {
    setCaptureState(initialState);
  }, []);

  const setError = useCallback((error: string) => {
    setCaptureState((prev) => ({ ...prev, error, isAnalyzing: false }));
  }, []);

  return {
    captureState,
    analyzeImage,
    clearState,
    setError,
  };
}
