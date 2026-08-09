import React from 'react';
import { APP_NAME } from '@/shared/constants';

type TabId = 'capture' | 'history' | 'settings';

interface HeaderProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'capture', label: 'Capture', icon: '📷' },
  { id: 'history', label: 'History', icon: '📋' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="flex-shrink-0 border-b border-app-border">
      {/* Brand Bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-app-accent to-emerald-600 flex items-center justify-center shadow-lg">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 3L1 8L4 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 3L15 8L12 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10 2L6 14" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-app-text leading-tight">{APP_NAME}</h1>
            <p className="text-2xs text-app-text-muted">Visual Code Reconstruction</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="badge-success text-2xs">v1.0</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <nav className="flex px-4 gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id ? 'tab-active' : 'tab-inactive'
            }`}
          >
            <span className="text-xs">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
