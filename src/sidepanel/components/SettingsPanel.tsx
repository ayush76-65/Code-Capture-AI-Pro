import React, { useState } from 'react';
import type { Settings } from '@/shared/types';
import { RecoveryModeSelector } from './RecoveryModeSelector';
import { APP_NAME, APP_VERSION } from '@/shared/constants';

interface SettingsPanelProps {
  settings: Settings;
  onUpdateSettings: (partial: Partial<Settings>) => void;
}

export function SettingsPanel({ settings, onUpdateSettings }: SettingsPanelProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<'success' | 'error' | null>(null);

  const handleTestConnection = async () => {
    if (!settings.apiKey) {
      setConnectionResult('error');
      return;
    }

    setTestingConnection(true);
    setConnectionResult(null);

    try {
      const { GeminiProvider } = await import('@/providers/gemini-provider');
      const provider = new GeminiProvider(settings.apiKey, settings.model);
      const ok = await provider.testConnection();
      setConnectionResult(ok ? 'success' : 'error');
    } catch {
      setConnectionResult('error');
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* ─── AI Configuration ───────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xs font-medium text-app-text-secondary uppercase tracking-wider flex items-center gap-2">
            <span>🤖</span> AI Configuration
          </h2>

          {/* API Key */}
          <div className="space-y-2">
            <label className="text-sm text-app-text font-medium">API Key</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.apiKey}
                  onChange={(e) => onUpdateSettings({ apiKey: e.target.value })}
                  placeholder="Enter your Gemini API key"
                  className="input-field pr-10"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-app-text-muted hover:text-app-text transition-colors p-1"
                >
                  {showApiKey ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8S4.5 3 8 3S14 8 14 8S11.5 13 8 13S2 8 2 8Z" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8S4.5 3 8 3S14 8 14 8S11.5 13 8 13S2 8 2 8Z" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M3 13L13 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </button>
              </div>
              <button
                onClick={handleTestConnection}
                disabled={testingConnection || !settings.apiKey}
                className="btn-secondary text-xs whitespace-nowrap"
              >
                {testingConnection ? (
                  <span className="animate-spin">⟳</span>
                ) : (
                  'Test'
                )}
              </button>
            </div>
            {connectionResult === 'success' && (
              <p className="text-xs text-green-400 flex items-center gap-1">
                <span>✓</span> Connection successful
              </p>
            )}
            {connectionResult === 'error' && (
              <p className="text-xs text-app-danger flex items-center gap-1">
                <span>✗</span> Connection failed. Check your API key.
              </p>
            )}
            <p className="text-2xs text-app-text-muted">
              Get your key at{' '}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-app-info hover:underline"
              >
                aistudio.google.com
              </a>
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-sm text-app-text font-medium">AI Model</label>
            <select
              value={settings.model}
              onChange={(e) => onUpdateSettings({ model: e.target.value as Settings['model'] })}
              className="input-field"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (Accurate)</option>
            </select>
            <p className="text-2xs text-app-text-muted">
              Flash is faster; Pro is more accurate for complex code.
            </p>
          </div>
        </section>

        <hr className="border-app-border" />

        {/* ─── Recovery Mode ──────────────────────────────────────── */}
        <section>
          <RecoveryModeSelector
            value={settings.recoveryMode}
            onChange={(mode) => onUpdateSettings({ recoveryMode: mode })}
          />
        </section>

        <hr className="border-app-border" />

        {/* ─── Editor Settings ────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xs font-medium text-app-text-secondary uppercase tracking-wider flex items-center gap-2">
            <span>📝</span> Editor
          </h2>

          {/* Font Size */}
          <div className="space-y-2">
            <label className="text-sm text-app-text font-medium">Font Size</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onUpdateSettings({ fontSize: Math.max(10, settings.fontSize - 1) })}
                className="btn-secondary text-xs w-8 h-8 p-0"
              >
                −
              </button>
              <span className="text-sm font-mono text-app-text w-8 text-center">
                {settings.fontSize}
              </span>
              <button
                onClick={() => onUpdateSettings({ fontSize: Math.min(24, settings.fontSize + 1) })}
                className="btn-secondary text-xs w-8 h-8 p-0"
              >
                +
              </button>
            </div>
          </div>

          {/* Word Wrap */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-app-text font-medium">Word Wrap</label>
            <ToggleSwitch
              checked={settings.wordWrap}
              onChange={(v) => onUpdateSettings({ wordWrap: v })}
            />
          </div>

          {/* Minimap */}
          <div className="flex items-center justify-between">
            <label className="text-sm text-app-text font-medium">Minimap</label>
            <ToggleSwitch
              checked={settings.minimap}
              onChange={(v) => onUpdateSettings({ minimap: v })}
            />
          </div>

          {/* Auto Copy */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm text-app-text font-medium">Auto Copy</label>
              <p className="text-2xs text-app-text-muted">Copy code to clipboard after extraction</p>
            </div>
            <ToggleSwitch
              checked={settings.autoCopy}
              onChange={(v) => onUpdateSettings({ autoCopy: v })}
            />
          </div>
        </section>

        <hr className="border-app-border" />

        {/* ─── Appearance ─────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xs font-medium text-app-text-secondary uppercase tracking-wider flex items-center gap-2">
            <span>🎨</span> Appearance
          </h2>

          <div className="flex items-center justify-between">
            <label className="text-sm text-app-text font-medium">Theme</label>
            <div className="flex gap-1 bg-app-bg rounded-lg p-1 border border-app-border">
              <button
                onClick={() => onUpdateSettings({ theme: 'dark' })}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  settings.theme === 'dark'
                    ? 'bg-app-accent text-white'
                    : 'text-app-text-secondary hover:text-app-text'
                }`}
              >
                🌙 Dark
              </button>
              <button
                onClick={() => onUpdateSettings({ theme: 'light' })}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  settings.theme === 'light'
                    ? 'bg-app-accent text-white'
                    : 'text-app-text-secondary hover:text-app-text'
                }`}
              >
                ☀️ Light
              </button>
            </div>
          </div>
        </section>

        <hr className="border-app-border" />

        {/* ─── About ──────────────────────────────────────────────── */}
        <section className="card p-4 space-y-2 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-app-accent to-emerald-600 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M4 3L1 8L4 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 3L15 8L12 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 2L6 14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-app-text">{APP_NAME}</span>
          </div>
          <p className="text-2xs text-app-text-muted">Version {APP_VERSION}</p>
          <p className="text-2xs text-app-text-muted">Visual Code Reconstruction Engine</p>
        </section>
      </div>
    </div>
  );
}

// ─── Toggle Switch Component ─────────────────────────────────────────────────

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
        checked ? 'bg-app-accent' : 'bg-app-border'
      }`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
