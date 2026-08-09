import React from 'react';

interface StatusBarProps {
  language: string;
  confidence: number;
  processingTimeMs: number;
  charCount: number;
  lineCount: number;
}

export function StatusBar({ language, confidence, processingTimeMs, charCount, lineCount }: StatusBarProps) {
  const confidenceColor =
    confidence >= 80
      ? 'text-green-400'
      : confidence >= 50
        ? 'text-yellow-400'
        : 'text-red-400';

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="flex-shrink-0 border-t border-app-border px-4 py-2 bg-app-panel/50">
      <div className="flex items-center justify-between text-2xs text-app-text-secondary">
        <div className="flex items-center gap-3">
          {language && language !== 'plaintext' && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-app-accent" />
              <span className="font-medium text-app-text">{language}</span>
            </div>
          )}

          {confidence > 0 && (
            <div className="flex items-center gap-1">
              <span>Confidence:</span>
              <span className={`font-medium ${confidenceColor}`}>{confidence}%</span>
            </div>
          )}

          {processingTimeMs > 0 && (
            <span>⏱ {formatTime(processingTimeMs)}</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {charCount > 0 && <span>{charCount} chars</span>}
          {lineCount > 0 && <span>{lineCount} lines</span>}
        </div>
      </div>
    </div>
  );
}
