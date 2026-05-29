import { useCallback, useRef } from 'react';

import type { GameBoard } from '@/types/sliding-puzzle';

import { getNextBoard, requireGameApiData } from '../api/gameApi';

interface UseBoardPrefetchReturn {
  /** Fire a background next-board fetch. No-op if already cached or fetching. */
  tryPrefetch: (currentRound: number, totalRounds: number) => void;
  /**
   * Returns the cached board if already available, or waits for the in-flight
   * prefetch to settle rather than letting the caller fire a second request.
   * Returns null only when no prefetch was started or the fetch failed.
   */
  awaitBoard: () => Promise<GameBoard | null>;
  /** Invalidate any cached / in-flight result and reset state. */
  reset: () => void;
}

/**
 * Next-board prefetch logic.
 *
 * Key invariant: at most ONE getNextBoard() call is ever in flight per round.
 * `awaitBoard()` blocks on the in-flight promise instead of letting the caller
 * issue a redundant parallel request.
 */
export function useBoardPrefetch(): UseBoardPrefetchReturn {
  const cacheRef = useRef<GameBoard | null>(null);
  const fetchingRef = useRef(false);
  // Stores the in-flight promise so awaitBoard() can join it
  const pendingRef = useRef<Promise<GameBoard | null>>(Promise.resolve(null));
  // Incremented on reset() so a stale in-flight result is silently discarded
  const generationRef = useRef(0);

  const tryPrefetch = useCallback((currentRound: number, totalRounds: number) => {
    if (cacheRef.current || fetchingRef.current) return;
    if (currentRound >= totalRounds) return;

    fetchingRef.current = true;
    generationRef.current += 1;
    const myGen = generationRef.current;

    pendingRef.current = (async (): Promise<GameBoard | null> => {
      try {
        const board = requireGameApiData(await getNextBoard(), 'Failed to prefetch board');
        // Only cache if this generation is still active (reset() not called)
        if (generationRef.current === myGen) {
          cacheRef.current = board;
          return board;
        }
        return null;
      } catch {
        // Silently fail — awaitBoard() will return null and the caller falls back
        return null;
      } finally {
        if (generationRef.current === myGen) {
          fetchingRef.current = false;
        }
      }
    })();
  }, []);

  const awaitBoard = useCallback(async (): Promise<GameBoard | null> => {
    // Already settled — return immediately
    if (cacheRef.current) {
      const cached = cacheRef.current;
      cacheRef.current = null;
      return cached;
    }
    // In-flight — join the existing promise instead of firing a second request
    if (fetchingRef.current) {
      const result = await pendingRef.current;
      cacheRef.current = null; // consume
      return result;
    }
    // Not started (shouldn't happen for non-last boards, but safe fallback)
    return null;
  }, []);

  const reset = useCallback(() => {
    // Bump generation so any in-flight fetch discards its result
    generationRef.current += 1;
    cacheRef.current = null;
    fetchingRef.current = false;
    pendingRef.current = Promise.resolve(null);
  }, []);

  return { tryPrefetch, awaitBoard, reset };
}
