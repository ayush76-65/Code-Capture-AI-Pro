import type { CaptureEntry } from '@/shared/types';
import { MAX_HISTORY_SIZE, STORAGE_KEYS } from '@/shared/constants';

class HistoryService {
  async getAll(): Promise<CaptureEntry[]> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
      return (result[STORAGE_KEYS.HISTORY] as CaptureEntry[]) || [];
    } catch {
      return [];
    }
  }

  async add(entry: CaptureEntry): Promise<void> {
    const history = await this.getAll();

    history.unshift(entry);

    if (history.length > MAX_HISTORY_SIZE) {
      history.splice(MAX_HISTORY_SIZE);
    }

    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history });
  }

  async remove(id: string): Promise<void> {
    const history = await this.getAll();
    const filtered = history.filter((entry) => entry.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: filtered });
  }

  async clear(): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: [] });
  }

  async getById(id: string): Promise<CaptureEntry | null> {
    const history = await this.getAll();
    return history.find((entry) => entry.id === id) || null;
  }

  async getByLanguage(language: string): Promise<CaptureEntry[]> {
    const history = await this.getAll();
    return history.filter(
      (entry) => entry.language.toLowerCase() === language.toLowerCase()
    );
  }

  onChanged(callback: (history: CaptureEntry[]) => void): () => void {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === 'local' && changes[STORAGE_KEYS.HISTORY]) {
        callback(changes[STORAGE_KEYS.HISTORY].newValue as CaptureEntry[]);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }

  generateId(): string {
    return `capture_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export const historyService = new HistoryService();
