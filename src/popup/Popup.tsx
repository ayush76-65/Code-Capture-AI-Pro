import React, { useState, useEffect, useCallback } from 'react';
import { APP_NAME, APP_VERSION, DEFAULT_SETTINGS, STORAGE_KEYS, RECOVERY_MODE_INFO } from '@/shared/constants';
import { MESSAGE_TYPES, createMessage } from '@/shared/messages';
import type { Settings, CaptureEntry, RecoveryMode } from '@/shared/types';

type TabId = 'settings' | 'history' | 'shortcuts';

export default function Popup() {
  const [activeTab, setActiveTab] = useState<TabId>('settings');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings on mount
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.SETTINGS).then((result) => {
      const stored = result[STORAGE_KEYS.SETTINGS];
      if (stored && typeof stored === 'object') {
        setSettings({ ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) } as Settings);
      }
      setIsLoaded(true);
    });
  }, []);

  const updateSettings = useCallback(async (partial: Partial<Settings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
  }, [settings]);

  if (!isLoaded) {
    return (
      <div className="dark w-full h-full flex items-center justify-center bg-app-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-app-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-app-text-secondary text-xs">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dark w-full h-full flex flex-col bg-app-bg text-app-text overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 border-b border-app-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-app-accent to-emerald-600 flex items-center justify-center shadow-lg">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M4 3L1 8L4 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 3L15 8L12 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 2L6 14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">{APP_NAME}</h1>
            <p className="text-2xs text-app-text-muted">v{APP_VERSION} • Dashboard</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {([
            { id: 'settings' as TabId, label: '⚙️ Settings', },
            { id: 'history' as TabId, label: '📋 History', },
            { id: 'shortcuts' as TabId, label: '⌨️ Shortcuts', },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === tab.id
                  ? 'bg-app-accent text-white'
                  : 'text-app-text-secondary hover:text-app-text hover:bg-app-panel'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <main className="flex-1 overflow-y-auto">
        {activeTab === 'settings' && (
          <SettingsTab settings={settings} onUpdate={updateSettings} />
        )}
        {activeTab === 'history' && (
          <HistoryTab />
        )}
        {activeTab === 'shortcuts' && (
          <ShortcutsTab />
        )}
      </main>
    </div>
  );
}

// ─── Settings Tab ───────────────────────────────────────────────────────────────

function SettingsTab({ settings, onUpdate }: { settings: Settings; onUpdate: (p: Partial<Settings>) => void }) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<'success' | 'error' | null>(null);

  const handleTestConnection = async () => {
    if (!settings.apiKey) { setConnectionResult('error'); return; }
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const { GeminiProvider } = await import('@/providers/gemini-provider');
      const provider = new GeminiProvider(settings.apiKey, settings.model);
      const ok = await provider.testConnection();
      setConnectionResult(ok ? 'success' : 'error');
    } catch { setConnectionResult('error'); }
    finally { setTestingConnection(false); }
  };

  return (
    <div className="p-4 space-y-5">
      {/* ── AI Provider ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium text-app-text-secondary uppercase tracking-wider flex items-center gap-2">
          <span>🤖</span> AI Provider
        </h2>

        {/* API Key */}
        <div className="space-y-1.5">
          <label className="text-xs text-app-text font-medium">Gemini API Key</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={settings.apiKey}
                onChange={(e) => onUpdate({ apiKey: e.target.value })}
                placeholder="Enter your Gemini API key"
                className="input-field text-xs pr-8"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text transition-colors p-0.5"
              >
                {showApiKey ? '👁️' : '🔒'}
              </button>
            </div>
            <button
              onClick={handleTestConnection}
              disabled={testingConnection || !settings.apiKey}
              className="btn-secondary text-xs whitespace-nowrap px-3"
            >
              {testingConnection ? '⟳' : 'Test'}
            </button>
          </div>
          {connectionResult === 'success' && (
            <p className="text-2xs text-green-400 flex items-center gap-1">✓ Connection successful</p>
          )}
          {connectionResult === 'error' && (
            <p className="text-2xs text-app-danger flex items-center gap-1">✗ Connection failed</p>
          )}
          <p className="text-2xs text-app-text-muted">
            Get your key at{' '}
            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
               className="text-app-info hover:underline">
              aistudio.google.com
            </a>
          </p>
        </div>

        {/* Model */}
        <div className="space-y-1.5">
          <label className="text-xs text-app-text font-medium">Model</label>
          <select
            value={settings.model}
            onChange={(e) => onUpdate({ model: e.target.value as Settings['model'] })}
            className="input-field text-xs"
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast)</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro (Accurate)</option>
          </select>
        </div>
      </section>

      <hr className="border-app-border" />

      {/* ── Recovery Mode ────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium text-app-text-secondary uppercase tracking-wider flex items-center gap-2">
          <span>🔧</span> Recovery Mode
        </h2>
        <div className="space-y-2">
          {(Object.entries(RECOVERY_MODE_INFO) as [RecoveryMode, typeof RECOVERY_MODE_INFO.strict][]).map(([mode, info]) => (
            <button
              key={mode}
              onClick={() => onUpdate({ recoveryMode: mode })}
              className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                settings.recoveryMode === mode
                  ? 'border-app-accent bg-app-accent/10'
                  : 'border-app-border bg-app-panel hover:border-app-text-muted'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{info.icon}</span>
                <span className="text-xs font-medium text-app-text">{info.label}</span>
              </div>
              <p className="text-2xs text-app-text-secondary mt-1 ml-6">{info.description}</p>
            </button>
          ))}
        </div>
      </section>

      <hr className="border-app-border" />

      {/* ── Behavior ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium text-app-text-secondary uppercase tracking-wider flex items-center gap-2">
          <span>⚡</span> Behavior
        </h2>

        <ToggleRow
          label="Auto Copy to Clipboard"
          description="Automatically copy recovered code after capture"
          checked={settings.autoCopy}
          onChange={(v) => onUpdate({ autoCopy: v })}
        />
        <ToggleRow
          label="Show Preview After Capture"
          description="Open a preview window to review code before pasting"
          checked={settings.showPreviewAfterCapture}
          onChange={(v) => onUpdate({ showPreviewAfterCapture: v })}
        />
      </section>

      <hr className="border-app-border" />

      {/* ── Editor Settings ──────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium text-app-text-secondary uppercase tracking-wider flex items-center gap-2">
          <span>📝</span> Editor
        </h2>
        <div className="flex items-center justify-between">
          <label className="text-xs text-app-text font-medium">Font Size</label>
          <div className="flex items-center gap-2">
            <button onClick={() => onUpdate({ fontSize: Math.max(10, settings.fontSize - 1) })}
                    className="btn-secondary text-xs w-7 h-7 p-0">−</button>
            <span className="text-xs font-mono text-app-text w-6 text-center">{settings.fontSize}</span>
            <button onClick={() => onUpdate({ fontSize: Math.min(24, settings.fontSize + 1) })}
                    className="btn-secondary text-xs w-7 h-7 p-0">+</button>
          </div>
        </div>
        <ToggleRow label="Word Wrap" checked={settings.wordWrap} onChange={(v) => onUpdate({ wordWrap: v })} />
        <ToggleRow label="Minimap" checked={settings.minimap} onChange={(v) => onUpdate({ minimap: v })} />
      </section>

      <hr className="border-app-border" />

      {/* ── About ────────────────────────────────────────────────── */}
      <section className="card p-3 text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-app-accent to-emerald-600 flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
              <path d="M4 3L1 8L4 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 3L15 8L12 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 2L6 14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-xs font-semibold text-app-text">{APP_NAME}</span>
        </div>
        <p className="text-2xs text-app-text-muted">v{APP_VERSION} • Visual Code Reconstruction Engine</p>
      </section>
    </div>
  );
}

// ─── History Tab ────────────────────────────────────────────────────────────────

function HistoryTab() {
  const [history, setHistory] = useState<CaptureEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.HISTORY).then((result) => {
      setHistory((result[STORAGE_KEYS.HISTORY] as CaptureEntry[]) || []);
      setIsLoading(false);
    });
  }, []);

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const handleClearHistory = async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: [] });
    setHistory([]);
  };

  const handleDeleteEntry = async (id: string) => {
    const updated = history.filter((e) => e.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: updated });
    setHistory(updated);
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-app-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-3xl mb-2">📋</div>
        <p className="text-sm text-app-text-secondary">No captures yet</p>
        <p className="text-2xs text-app-text-muted mt-1">
          Press <kbd className="px-1.5 py-0.5 bg-app-bg rounded text-2xs border border-app-border">Alt+V</kbd> or{' '}
          <kbd className="px-1.5 py-0.5 bg-app-bg rounded text-2xs border border-app-border">Alt+C</kbd> to capture code
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-2xs text-app-text-muted">{history.length} capture{history.length !== 1 ? 's' : ''}</span>
        <button onClick={handleClearHistory} className="text-2xs text-app-danger hover:underline">
          Clear All
        </button>
      </div>

      {history.map((entry) => (
        <div key={entry.id} className="card p-3 space-y-2 group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="badge-info text-2xs">{entry.language}</span>
              <span className="text-2xs text-app-text-muted">{entry.confidence}%</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleCopyCode(entry.code)}
                className="text-2xs text-app-info hover:underline"
              >
                Copy
              </button>
              <span className="text-app-text-muted">·</span>
              <button
                onClick={() => handleDeleteEntry(entry.id)}
                className="text-2xs text-app-danger hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
          <pre className="text-2xs text-app-text-secondary bg-app-bg rounded p-2 overflow-x-auto max-h-24 overflow-y-auto font-mono leading-relaxed">
            {entry.code.substring(0, 500)}{entry.code.length > 500 ? '...' : ''}
          </pre>
          <div className="flex items-center justify-between text-2xs text-app-text-muted">
            <span>{entry.source} • {entry.processingTimeMs}ms</span>
            <span>{new Date(entry.timestamp).toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Shortcuts Tab ──────────────────────────────────────────────────────────────

function ShortcutsTab() {
  return (
    <div className="p-4 space-y-4">
      <section className="space-y-3">
        <h2 className="text-xs font-medium text-app-text-secondary uppercase tracking-wider flex items-center gap-2">
          <span>⌨️</span> Global Shortcuts
        </h2>

        <ShortcutCard
          shortcut="Alt + V"
          title="Video Frame Capture"
          description="Captures the current video frame, sends to AI, and copies recovered code to clipboard automatically."
          steps={['Detects active video on page', 'Captures frame at native resolution', 'AI analyzes and recovers code', 'Code auto-copied to clipboard']}
        />

        <ShortcutCard
          shortcut="Alt + C"
          title="Region Select Capture"
          description="Opens a crosshair overlay to select a screen region, then processes the selected area."
          steps={['Dark overlay appears with crosshair', 'Drag to select code region', 'AI analyzes selected area', 'Code auto-copied to clipboard']}
        />
      </section>

      <hr className="border-app-border" />

      <section className="space-y-3">
        <h2 className="text-xs font-medium text-app-text-secondary uppercase tracking-wider flex items-center gap-2">
          <span>💡</span> How It Works
        </h2>
        <div className="card p-3 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-2xs text-app-text-secondary">
              <span className="w-5 h-5 rounded-full bg-app-accent/20 text-app-accent flex items-center justify-center text-xs font-bold">1</span>
              <span>Shortcut</span>
            </div>
            <span className="text-app-text-muted">→</span>
            <div className="flex items-center gap-1.5 text-2xs text-app-text-secondary">
              <span className="w-5 h-5 rounded-full bg-app-accent/20 text-app-accent flex items-center justify-center text-xs font-bold">2</span>
              <span>Capture</span>
            </div>
            <span className="text-app-text-muted">→</span>
            <div className="flex items-center gap-1.5 text-2xs text-app-text-secondary">
              <span className="w-5 h-5 rounded-full bg-app-accent/20 text-app-accent flex items-center justify-center text-xs font-bold">3</span>
              <span>AI</span>
            </div>
            <span className="text-app-text-muted">→</span>
            <div className="flex items-center gap-1.5 text-2xs text-app-text-secondary">
              <span className="w-5 h-5 rounded-full bg-app-accent/20 text-app-accent flex items-center justify-center text-xs font-bold">4</span>
              <span>Clipboard</span>
            </div>
          </div>
          <p className="text-2xs text-app-text-muted">
            No sidebar. No popup. Just press the shortcut and paste in your editor.
          </p>
        </div>
      </section>

      <hr className="border-app-border" />

      <section className="space-y-2">
        <h2 className="text-xs font-medium text-app-text-secondary uppercase tracking-wider flex items-center gap-2">
          <span>🔧</span> Customize Shortcuts
        </h2>
        <p className="text-2xs text-app-text-secondary">
          To change keyboard shortcuts, visit Chrome's extension shortcuts page:
        </p>
        <button
          onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}
          className="btn-secondary w-full text-xs py-2"
        >
          ⚙️ Open Shortcut Settings
        </button>
      </section>
    </div>
  );
}

// ─── Shortcut Card Component ────────────────────────────────────────────────────

function ShortcutCard({ shortcut, title, description, steps }: {
  shortcut: string;
  title: string;
  description: string;
  steps: string[];
}) {
  return (
    <div className="card p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-app-text">{title}</span>
        <kbd className="px-2.5 py-1 bg-app-bg rounded-md text-xs font-mono border border-app-border text-app-accent font-medium">
          {shortcut}
        </kbd>
      </div>
      <p className="text-2xs text-app-text-secondary">{description}</p>
      <div className="space-y-1">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2 text-2xs text-app-text-muted">
            <span className="text-app-accent">→</span>
            <span>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Toggle Row Component ───────────────────────────────────────────────────────

function ToggleRow({ label, description, checked, onChange }: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <label className="text-xs text-app-text font-medium">{label}</label>
        {description && <p className="text-2xs text-app-text-muted">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ml-3 ${
          checked ? 'bg-app-accent' : 'bg-app-border'
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
