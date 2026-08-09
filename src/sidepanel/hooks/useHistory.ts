import { useState, useEffect, useCallback } from 'react';
import type { CaptureEntry } from '@/shared/types';
import { historyService } from '@/services/history-service';

export function useHistory() {
  const [history, setHistory] = useState<CaptureEntry[]>([]);

  useEffect(() => {
    historyService.getAll().then(setHistory);

    const unsubscribe = historyService.onChanged((newHistory) => {
      setHistory(newHistory);
    });

    return unsubscribe;
  }, []);

  const addEntry = useCallback(async (entry: CaptureEntry) => {
    await historyService.add(entry);
    const updated = await historyService.getAll();
    setHistory(updated);
  }, []);

  const removeEntry = useCallback(async (id: string) => {
    await historyService.remove(id);
    const updated = await historyService.getAll();
    setHistory(updated);
  }, []);

  const clearAll = useCallback(async () => {
    await historyService.clear();
    setHistory([]);
  }, []);

  return {
    history,
    addEntry,
    removeEntry,
    clearAll,
  };
}
