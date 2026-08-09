import React from 'react';
import type { RecoveryMode } from '@/shared/types';
import { RECOVERY_MODE_INFO } from '@/shared/constants';

interface RecoveryModeSelectorProps {
  value: RecoveryMode;
  onChange: (mode: RecoveryMode) => void;
  compact?: boolean;
}

const modes: RecoveryMode[] = ['strict', 'visual', 'advanced'];

export function RecoveryModeSelector({ value, onChange, compact = false }: RecoveryModeSelectorProps) {
  if (compact) {
    return (
      <div className="flex gap-1 bg-app-bg rounded-lg p-1 border border-app-border">
        {modes.map((mode) => {
          const info = RECOVERY_MODE_INFO[mode];
          const isActive = value === mode;
          return (
            <button
              key={mode}
              onClick={() => onChange(mode)}
              title={info.description}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-app-accent text-white shadow-sm'
                  : 'text-app-text-secondary hover:text-app-text hover:bg-app-panel'
              }`}
            >
              <span>{info.icon}</span>
              <span className="hidden sm:inline">{info.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-app-text-secondary uppercase tracking-wider">
        Recovery Mode
      </label>
      <div className="space-y-1.5">
        {modes.map((mode) => {
          const info = RECOVERY_MODE_INFO[mode];
          const isActive = value === mode;
          return (
            <button
              key={mode}
              onClick={() => onChange(mode)}
              className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                isActive
                  ? 'bg-app-accent/10 border-app-accent/50 glow-accent'
                  : 'bg-app-bg border-app-border hover:border-app-text-muted'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{info.icon}</span>
                <span className={`text-sm font-medium ${isActive ? 'text-app-accent' : 'text-app-text'}`}>
                  {info.label}
                </span>
              </div>
              <p className="mt-1 text-xs text-app-text-secondary ml-6 leading-relaxed">
                {info.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
