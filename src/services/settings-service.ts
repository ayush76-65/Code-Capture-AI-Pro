import type { Settings } from '@/shared/types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '@/shared/constants';

class SettingsService {
  private cache: Settings | null = null;

  async get(): Promise<Settings> {
    if (this.cache) return { ...this.cache };

    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      const stored = result[STORAGE_KEYS.SETTINGS];

      if (stored && typeof stored === 'object') {
        this.cache = { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) } as Settings;
      } else {
        this.cache = { ...DEFAULT_SETTINGS };
      }

      return { ...this.cache };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  async update(partial: Partial<Settings>): Promise<Settings> {
    const current = await this.get();
    const updated = { ...current, ...partial };
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
    this.cache = updated;
    return { ...updated };
  }

  async reset(): Promise<Settings> {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS });
    this.cache = { ...DEFAULT_SETTINGS };
    return { ...this.cache };
  }

  onChanged(callback: (settings: Settings) => void): () => void {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === 'local' && changes[STORAGE_KEYS.SETTINGS]) {
        const newSettings = changes[STORAGE_KEYS.SETTINGS].newValue as Settings;
        this.cache = newSettings;
        callback(newSettings);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }
}

export const settingsService = new SettingsService();
