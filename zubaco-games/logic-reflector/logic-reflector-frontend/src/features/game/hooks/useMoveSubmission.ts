import { useCallback, useRef, useState } from 'react';
import type { BlockType, EndBoardResponse, GameMove } from '@/types/logic-reflector';
import { storage } from '@/utils/storage';
import { endBoard, ensureGameApiSuccess, requireGameApiData, submitMoves } from '../api/gameApi';

const FLUSH_INTERVAL_MS = 5000;
const defaultTimestamp = () => new Date().toISOString();

// Module-level barrier — survives React 18 StrictMode double-mount.
// submitMoves → endBoard never run in parallel.
let _barrier: Promise<void> = Promise.resolve();

function _queue<T>(task: () => Promise<T>): Promise<T> {
  const next = _barrier.then(task, task);
  _barrier = next.then(() => undefined, () => undefined);
  return next;
}

interface UseMoveSubmissionReturn {
  pushMove: (row: number, col: number, blockType: BlockType | null, levelNumber: number, blockId?: string) => void;
  flushLevel: (levelNumber: number) => Promise<void>;
  flushAll: () => Promise<void>;
  queueEndBoard: () => Promise<EndBoardResponse>;
  startAutoFlush: (levelNumber: number) => void;
  stopAutoFlush: () => void;
  hydrateFromSession: (byLevel: Record<string, GameMove[]>) => void;
  reset: () => void;
  getPendingByLevel: () => Record<string, GameMove[]>;
  pendingCount: number;
}

export function useMoveSubmission(
  createTimestamp: () => string = defaultTimestamp,
): UseMoveSubmissionReturn {
  const pendingByLevel = useRef<Map<number, GameMove[]>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const updateCount = useCallback(() => {
    let total = 0;
    for (const moves of pendingByLevel.current.values()) total += moves.length;
    setPendingCount(total);
  }, []);

  const pushMove = useCallback(
    (row: number, col: number, blockType: BlockType | null, levelNumber: number, blockId?: string) => {
      const move: GameMove = {
        moveId: crypto.randomUUID(),
        blockId,
        row,
        col,
        blockType,
        placedAt: createTimestamp(),
      };
      const existing = pendingByLevel.current.get(levelNumber) ?? [];
      pendingByLevel.current.set(levelNumber, [...existing, move]);
      updateCount();
      void storage.appendPendingMove(levelNumber, move);
    },
    [createTimestamp, updateCount],
  );

  const flushLevel = useCallback(
    (levelNumber: number): Promise<void> => {
      const moves = pendingByLevel.current.get(levelNumber) ?? [];
      if (moves.length === 0) return _barrier;

      pendingByLevel.current.set(levelNumber, []);
      updateCount();

      return _queue(async () => {
        try {
          ensureGameApiSuccess(await submitMoves(moves));
          void storage.removePendingMoves(levelNumber, new Set(moves.map((m) => m.moveId)));
        } catch (err) {
          const current = pendingByLevel.current.get(levelNumber) ?? [];
          pendingByLevel.current.set(levelNumber, [...moves, ...current]);
          updateCount();
          throw err;
        }
      });
    },
    [updateCount],
  );

  const flushAll = useCallback(async (): Promise<void> => {
    for (const ln of [...pendingByLevel.current.keys()]) {
      await flushLevel(ln);
    }
  }, [flushLevel]);

  const queueEndBoard = useCallback((): Promise<EndBoardResponse> => {
    const snapshot: Array<[number, GameMove[]]> = [...pendingByLevel.current.entries()]
      .filter(([, m]) => m.length > 0)
      .map(([ln, m]) => [ln, [...m]]);

    for (const [ln] of snapshot) pendingByLevel.current.set(ln, []);
    updateCount();

    return _queue(async () => {
      const unsent = new Map(snapshot);
      try {
        for (const [ln, moves] of snapshot) {
          ensureGameApiSuccess(await submitMoves(moves));
          void storage.removePendingMoves(ln, new Set(moves.map((m) => m.moveId)));
          unsent.delete(ln);
        }
        return requireGameApiData(await endBoard(), 'Failed to end board');
      } catch (err) {
        for (const [ln, moves] of unsent.entries()) {
          const current = pendingByLevel.current.get(ln) ?? [];
          pendingByLevel.current.set(ln, [...moves, ...current]);
        }
        updateCount();
        throw err;
      }
    });
  }, [updateCount]);

  const startAutoFlush = useCallback(
    (levelNumber: number) => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      flushTimerRef.current = setInterval(() => {
        void flushLevel(levelNumber);
      }, FLUSH_INTERVAL_MS);
    },
    [flushLevel],
  );

  const stopAutoFlush = useCallback(() => {
    if (flushTimerRef.current) { clearInterval(flushTimerRef.current); flushTimerRef.current = null; }
  }, []);

  const hydrateFromSession = useCallback(
    (byLevel: Record<string, GameMove[]>) => {
      pendingByLevel.current.clear();
      for (const [ln, moves] of Object.entries(byLevel)) {
        if (moves.length > 0) pendingByLevel.current.set(Number(ln), moves);
      }
      updateCount();
    },
    [updateCount],
  );

  const reset = useCallback(() => {
    pendingByLevel.current.clear();
    _barrier = Promise.resolve();
    updateCount();
  }, [updateCount]);

  const getPendingByLevel = useCallback((): Record<string, GameMove[]> => {
    const out: Record<string, GameMove[]> = {};
    for (const [ln, moves] of pendingByLevel.current.entries()) {
      if (moves.length > 0) out[String(ln)] = moves;
    }
    return out;
  }, []);

  return {
    pushMove,
    flushLevel,
    flushAll,
    queueEndBoard,
    startAutoFlush,
    stopAutoFlush,
    hydrateFromSession,
    reset,
    getPendingByLevel,
    pendingCount,
  };
}
