import React, { useState, useEffect, useCallback } from 'react';
import { CodeEditor } from './CodeEditor';
import { ImageUpload } from './ImageUpload';
import { RecoveryModeSelector } from './RecoveryModeSelector';
import { CopyActions } from './CopyActions';
import { StatusBar } from './StatusBar';
import { ErrorBanner } from './ErrorBanner';
import { useCapture } from '../hooks/useCapture';
import type { Settings, CaptureEntry } from '@/shared/types';
import {
  MESSAGE_TYPES,
  createMessage,
  type ExtensionMessage,
  type FrameCapturedPayload,
  type RegionCapturedPayload,
} from '@/shared/messages';
import { cropImage } from '@/services/image-utils';

interface CapturePanelProps {
  settings: Settings;
  onUpdateSettings: (partial: Partial<Settings>) => void;
  historyEntry: CaptureEntry | null;
  onClearHistoryEntry: () => void;
}

export function CapturePanel({
  settings,
  onUpdateSettings,
  historyEntry,
  onClearHistoryEntry,
}: CapturePanelProps) {
  const {
    captureState,
    analyzeImage,
    clearState,
    setError,
  } = useCapture(settings);

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Load history entry if selected
  useEffect(() => {
    if (historyEntry) {
      clearState();
      setImagePreview(historyEntry.thumbnailBase64 || null);
      // Directly set the recovered code from history
      analyzeImage(historyEntry.thumbnailBase64, true, {
        code: historyEntry.code,
        language: historyEntry.language,
        confidence: historyEntry.confidence,
      });
      onClearHistoryEntry();
    }
  }, [historyEntry]);

  // Listen for messages from background (captures)
  useEffect(() => {
    const listener = (message: ExtensionMessage) => {
      if (!message?.type) return;

      switch (message.type) {
        case MESSAGE_TYPES.FRAME_CAPTURED: {
          const payload = message.payload as FrameCapturedPayload;
          setImagePreview(payload.imageData);
          analyzeImage(payload.imageData);
          break;
        }
        case MESSAGE_TYPES.REGION_CAPTURED: {
          const payload = message.payload as RegionCapturedPayload;
          // Crop the screenshot to the selected region
          cropImage(payload.imageData, payload.rect)
            .then((cropped) => {
              setImagePreview(cropped);
              analyzeImage(cropped);
            })
            .catch((err) => {
              setError(`Failed to crop region: ${err.message}`);
            });
          break;
        }
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [analyzeImage, setError]);

  // Handle capture video frame
  const handleCaptureFrame = useCallback(() => {
    chrome.runtime.sendMessage(createMessage(MESSAGE_TYPES.CAPTURE_REQUEST));
  }, []);

  // Handle region selection
  const handleRegionSelect = useCallback(() => {
    chrome.runtime.sendMessage(createMessage(MESSAGE_TYPES.START_REGION_SELECT));
  }, []);

  // Handle image upload
  const handleImageUpload = useCallback((dataUrl: string) => {
    setImagePreview(dataUrl);
    analyzeImage(dataUrl);
  }, [analyzeImage]);

  const hasCode = captureState.recoveredCode !== null;
  const code = captureState.recoveredCode?.code || '';
  const language = captureState.recoveredCode?.language || 'plaintext';
  const confidence = captureState.recoveredCode?.confidence || 0;
  const processingTimeMs = captureState.recoveredCode?.processingTimeMs || 0;

  return (
    <div className="h-full flex flex-col">
      {/* Error Banner */}
      {captureState.error && (
        <ErrorBanner
          message={captureState.error}
          onDismiss={() => clearState()}
          onRetry={imagePreview ? () => analyzeImage(imagePreview) : undefined}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {!hasCode && !captureState.isAnalyzing ? (
          // ─── Empty State / Capture Actions ───
          <div className="p-4 space-y-4">
            {/* Capture Buttons */}
            <div className="space-y-3">
              <h2 className="text-xs font-medium text-app-text-secondary uppercase tracking-wider">
                Capture Source
              </h2>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleCaptureFrame} className="btn-primary py-3 flex-col gap-1.5">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="2" y="3" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M8 7L12 10L8 13V7Z" fill="currentColor"/>
                    <path d="M6 18H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span>Video Frame</span>
                  <span className="text-2xs opacity-70">Alt+V</span>
                </button>

                <button onClick={handleRegionSelect} className="btn-secondary py-3 flex-col gap-1.5">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M2 6V3C2 2.45 2.45 2 3 2H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M14 2H17C17.55 2 18 2.45 18 3V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M18 14V17C18 17.55 17.55 18 17 18H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M6 18H3C2.45 18 2 17.55 2 17V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <rect x="5" y="5" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2"/>
                  </svg>
                  <span>Select Region</span>
                  <span className="text-2xs opacity-50">Alt+C</span>
                </button>
              </div>
            </div>

            {/* Recovery Mode */}
            <RecoveryModeSelector
              value={settings.recoveryMode}
              onChange={(mode) => onUpdateSettings({ recoveryMode: mode })}
              compact
            />

            {/* Image Upload */}
            <div className="space-y-2">
              <h2 className="text-xs font-medium text-app-text-secondary uppercase tracking-wider">
                Or Upload Image
              </h2>
              <ImageUpload onImageSelected={handleImageUpload} />
            </div>

            {/* Quick Tips */}
            <div className="card p-4 space-y-2">
              <h3 className="text-xs font-medium text-app-text-secondary uppercase tracking-wider">
                Quick Tips
              </h3>
              <ul className="space-y-1.5 text-xs text-app-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-app-accent mt-0.5">•</span>
                  <span>Press <kbd className="px-1.5 py-0.5 bg-app-bg rounded text-2xs border border-app-border">Alt+V</kbd> or <kbd className="px-1.5 py-0.5 bg-app-bg rounded text-2xs border border-app-border">Alt+C</kbd> on any page to capture</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-app-accent mt-0.5">•</span>
                  <span>Works on YouTube, Udemy, Coursera, and more</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-app-accent mt-0.5">•</span>
                  <span>Use "Select Region" for docs, PDFs, and blogs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-app-accent mt-0.5">•</span>
                  <span>Paste screenshots directly with Ctrl+V</span>
                </li>
              </ul>
            </div>
          </div>
        ) : captureState.isAnalyzing ? (
          // ─── Loading State ───
          <div className="p-4 space-y-4">
            {imagePreview && (
              <div className="rounded-xl overflow-hidden border border-app-border">
                <img
                  src={imagePreview}
                  alt="Captured"
                  className="w-full h-auto max-h-48 object-contain bg-black/30"
                />
              </div>
            )}

            <div className="card p-6 flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-3 border-app-border rounded-full" />
                <div className="absolute inset-0 w-12 h-12 border-3 border-app-accent border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-app-text">Analyzing Code</p>
                <p className="text-xs text-app-text-secondary mt-1">
                  Vision AI is reconstructing the code...
                </p>
              </div>
              <div className="w-full loading-shimmer h-1 rounded-full" />
            </div>
          </div>
        ) : (
          // ─── Code Result ───
          <div className="flex flex-col h-full">
            {/* Image Preview (collapsed) */}
            {imagePreview && (
              <div className="px-4 pt-3">
                <div className="rounded-lg overflow-hidden border border-app-border cursor-pointer group relative">
                  <img
                    src={imagePreview}
                    alt="Source"
                    className="w-full h-24 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs">Click to expand</span>
                  </div>
                </div>
              </div>
            )}

            {/* Recovery Mode + Actions */}
            <div className="px-4 pt-3 flex items-center justify-between">
              <RecoveryModeSelector
                value={settings.recoveryMode}
                onChange={(mode) => onUpdateSettings({ recoveryMode: mode })}
                compact
              />
              <button
                onClick={() => {
                  clearState();
                  setImagePreview(null);
                }}
                className="btn-ghost text-xs"
              >
                ✕ Clear
              </button>
            </div>

            {/* Code Editor */}
            <div className="flex-1 px-4 py-3 min-h-0">
              <CodeEditor
                code={code}
                language={language}
                fontSize={settings.fontSize}
                wordWrap={settings.wordWrap}
                minimap={settings.minimap}
              />
            </div>

            {/* Copy Actions */}
            <div className="px-4 pb-3">
              <CopyActions code={code} language={language} />
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      {hasCode && (
        <StatusBar
          language={language}
          confidence={confidence}
          processingTimeMs={processingTimeMs}
          charCount={code.length}
          lineCount={code.split('\n').length}
        />
      )}
    </div>
  );
}
