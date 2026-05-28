import { useCallback, useRef } from 'react';

import type { GameSession } from '@/types/logic-reflector';

import { getNextLevel, requireGameApiData } from '../api/gameApi';

interface UseLevelPrefetchReturn {
  tryPrefetch: (currentLevel: number, totalLevels: number) => void;
  awaitLevel: () => Promise<GameSession | null>;
  reset: () => void;
}

export function useLevelPrefetch(): UseLevelPrefetchReturn {
  const cacheRef = useRef<GameSession | null>(null);
  const fetchingRef = useRef(false);
  const pendingRef = useRef<Promise<GameSession | null>>(Promise.resolve(null));
  const generationRef = useRef(0);

  const tryPrefetch = useCallback((currentLevel: number, totalLevels: number) => {
    if (cacheRef.current || fetchingRef.current) return;
    if (currentLevel >= totalLevels) return;

    fetchingRef.current = true;
    generationRef.current += 1;
    const myGen = generationRef.current;

    pendingRef.current = (async (): Promise<GameSession | null> => {
      try {
        const session = requireGameApiData(await getNextLevel(), 'Failed to prefetch next level');
        if (generationRef.current === myGen) {
          cacheRef.current = session;
          return session;
        }
        return null;
      } catch {
        return null;
      } finally {
        if (generationRef.current === myGen) {
          fetchingRef.current = false;
        }
      }
    })();
  }, []);

  const awaitLevel = useCallback(async (): Promise<GameSession | null> => {
    if (cacheRef.current) {
      const cached = cacheRef.current;
      cacheRef.current = null;
      return cached;
    }

    if (fetchingRef.current) {
      const result = await pendingRef.current;
      cacheRef.current = null;
      return result;
    }

    return null;
  }, []);

  const reset = useCallback(() => {
    generationRef.current += 1;
    cacheRef.current = null;
    fetchingRef.current = false;
    pendingRef.current = Promise.resolve(null);
  }, []);

  return { tryPrefetch, awaitLevel, reset };
}
