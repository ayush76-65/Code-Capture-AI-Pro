import React, { useState } from 'react';
import { TOAST_DURATION_MS } from '@/shared/constants';
import { getFileExtension } from '@/services/language-detector';

interface CopyActionsProps {
  code: string;
  language: string;
}

export function CopyActions({ code, language }: CopyActionsProps) {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), TOAST_DURATION_MS);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      showToast('Code copied successfully!');
    } catch {
      showToast('Failed to copy code');
    }
  };

  const copyWithoutLineNumbers = async () => {
    try {
      // Remove leading line numbers if present (e.g., "1  ", "12 ", etc.)
      const cleaned = code
        .split('\n')
        .map((line) => line.replace(/^\s*\d+\s{1,4}/, ''))
        .join('\n');
      await navigator.clipboard.writeText(cleaned);
      showToast('Code copied (no line numbers)!');
    } catch {
      showToast('Failed to copy code');
    }
  };

  const downloadAsFile = () => {
    const ext = getFileExtension(language);
    const filename = `captured_code${ext}`;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded as ${filename}`);
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2">
        <button onClick={copyCode} className="btn-primary text-xs py-1.5 px-3">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10 4V2.5C10 1.67 9.33 1 8.5 1H2.5C1.67 1 1 1.67 1 2.5V8.5C1 9.33 1.67 10 2.5 10H4" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
          Copy Code
        </button>

        <button onClick={copyWithoutLineNumbers} className="btn-secondary text-xs py-1.5 px-3">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M4 3H12M4 7H12M4 11H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          No Line Numbers
        </button>

        <button onClick={downloadAsFile} className="btn-secondary text-xs py-1.5 px-3">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1V9M7 9L4 6M7 9L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M1 11V12C1 12.55 1.45 13 2 13H12C12.55 13 13 12.55 13 12V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Download
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 toast-enter">
          <div className="bg-app-accent text-white text-xs font-medium px-4 py-2 rounded-lg shadow-lg whitespace-nowrap flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="white" strokeWidth="1.5"/>
              <path d="M4.5 7L6.5 9L10 4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
