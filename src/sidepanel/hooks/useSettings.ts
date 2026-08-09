import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '@/shared/types';
import { settingsService } from '@/services/settings-service';
import { DEFAULT_SETTINGS } from '@/shared/constants';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    settingsService.get().then((s) => {
      setSettings(s);
      setIsLoaded(true);
    });

    const unsubscribe = settingsService.onChanged((newSettings) => {
      setSettings(newSettings);
    });

    return unsubscribe;
  }, []);

  const updateSettings = useCallback(async (partial: Partial<Settings>) => {
    const updated = await settingsService.update(partial);
    setSettings(updated);
  }, []);

  const resetSettings = useCallback(async () => {
    const reset = await settingsService.reset();
    setSettings(reset);
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
    isLoaded,
  };
}
