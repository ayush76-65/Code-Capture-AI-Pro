import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { CapturePanel } from './components/CapturePanel';
import { HistoryPanel } from './components/HistoryPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { useSettings } from './hooks/useSettings';
import type { CaptureEntry } from '@/shared/types';

type TabId = 'capture' | 'history' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('capture');
  const { settings, updateSettings, isLoaded } = useSettings();
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<CaptureEntry | null>(null);

  const themeClass = settings.theme === 'dark' ? 'dark' : 'light';

  // Apply theme to html element
  useEffect(() => {
    document.documentElement.className = themeClass;
  }, [themeClass]);

  const handleHistorySelect = useCallback((entry: CaptureEntry) => {
    setSelectedHistoryEntry(entry);
    setActiveTab('capture');
  }, []);

  if (!isLoaded) {
    return (
      <div className={`${themeClass} w-full h-full flex items-center justify-center bg-app-bg`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-app-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-app-text-secondary text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${themeClass} w-full h-full flex flex-col bg-app-bg overflow-hidden`}>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-hidden">
        {activeTab === 'capture' && (
          <CapturePanel
            settings={settings}
            onUpdateSettings={updateSettings}
            historyEntry={selectedHistoryEntry}
            onClearHistoryEntry={() => setSelectedHistoryEntry(null)}
          />
        )}
        {activeTab === 'history' && (
          <HistoryPanel onSelect={handleHistorySelect} />
        )}
        {activeTab === 'settings' && (
          <SettingsPanel
            settings={settings}
            onUpdateSettings={updateSettings}
          />
        )}
      </main>
    </div>
  );
}
