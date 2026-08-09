import { useMemo } from 'react';
import type { Settings } from '@/shared/types';
import { GeminiProvider } from '@/providers/gemini-provider';
import type { VisionProvider } from '@/providers/types';

export function useVisionProvider(settings: Settings): {
  provider: VisionProvider | null;
  isConfigured: boolean;
} {
  const provider = useMemo(() => {
    if (!settings.apiKey) return null;

    switch (settings.provider) {
      case 'gemini':
        return new GeminiProvider(settings.apiKey, settings.model);
      default:
        return null;
    }
  }, [settings.apiKey, settings.model, settings.provider]);

  return {
    provider,
    isConfigured: !!settings.apiKey,
  };
}
