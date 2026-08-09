import React from 'react';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onDismiss, onRetry }: ErrorBannerProps) {
  return (
    <div className="mx-4 mt-3 animate-slide-down">
      <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-900/40 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="#f85149" strokeWidth="1.5"/>
              <path d="M8 4.5V9" stroke="#f85149" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="8" cy="11.5" r="0.75" fill="#f85149"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-app-danger font-medium mb-1">Error</p>
            <p className="text-xs text-app-text-secondary leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-app-text-muted hover:text-app-text transition-colors p-1"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        {onRetry && (
          <div className="mt-3 flex justify-end">
            <button onClick={onRetry} className="btn-ghost text-xs text-app-danger hover:text-red-400">
              ↻ Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
