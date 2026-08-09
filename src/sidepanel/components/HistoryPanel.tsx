import React, { useMemo, useState } from 'react';
import { useHistory } from '../hooks/useHistory';
import type { CaptureEntry } from '@/shared/types';

interface HistoryPanelProps {
  onSelect: (entry: CaptureEntry) => void;
}

export function HistoryPanel({ onSelect }: HistoryPanelProps) {
  const { history, removeEntry, clearAll } = useHistory();
  const [filter, setFilter] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filteredHistory = useMemo(() => {
    if (!filter) return history;
    const lower = filter.toLowerCase();
    return history.filter(
      (entry) =>
        entry.language.toLowerCase().includes(lower) ||
        entry.code.toLowerCase().includes(lower)
    );
  }, [history, filter]);

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-app-text">
            Capture History
            <span className="ml-2 text-xs text-app-text-muted">({history.length}/50)</span>
          </h2>

          {history.length > 0 && (
            <div>
              {showClearConfirm ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      clearAll();
                      setShowClearConfirm(false);
                    }}
                    className="btn-danger text-xs py-1 px-2"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="btn-ghost text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="btn-ghost text-xs text-app-text-muted"
                >
                  Clear All
                </button>
              )}
            </div>
          )}
        </div>

        {history.length > 3 && (
          <input
            type="text"
            placeholder="Filter by language or code..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-field text-xs"
          />
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-app-panel flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L12 22M12 2L8 6M12 2L16 6" stroke="#484f58" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="4" y="8" width="16" height="12" rx="2" stroke="#484f58" strokeWidth="1.5"/>
              </svg>
            </div>
            <p className="text-sm text-app-text-secondary">No captures yet</p>
            <p className="text-xs text-app-text-muted mt-1">
              {filter ? 'No matches for your filter' : 'Capture some code to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredHistory.map((entry) => (
              <button
                key={entry.id}
                onClick={() => onSelect(entry)}
                className="w-full text-left card p-3 hover:border-app-text-muted transition-all duration-200 group animate-fade-in"
              >
                <div className="flex gap-3">
                  {/* Thumbnail */}
                  {entry.thumbnailBase64 && (
                    <div className="flex-shrink-0 w-16 h-12 rounded-md overflow-hidden bg-black/30 border border-app-border">
                      <img
                        src={entry.thumbnailBase64}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge-info text-2xs">{entry.language}</span>
                      <span className="text-2xs text-app-text-muted">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-app-text-secondary truncate font-mono">
                      {entry.code.split('\n')[0]?.substring(0, 60) || 'Empty'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xs text-app-text-muted">
                        {entry.code.split('\n').length} lines
                      </span>
                      <span className="text-2xs text-app-text-muted">
                        {entry.confidence}% confidence
                      </span>
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeEntry(entry.id);
                    }}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-app-text-muted hover:text-app-danger p-1"
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 3.5H11M5.5 3.5V2.5C5.5 2.22 5.72 2 6 2H8C8.28 2 8.5 2.22 8.5 2.5V3.5M4 5V11C4 11.55 4.45 12 5 12H9C9.55 12 10 11.55 10 11V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
