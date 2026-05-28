import { useCallback, useRef, useState } from 'react';

import type { EndBoardResponse, GameMove } from '@/types/sliding-puzzle';
import { storage } from '@/utils/storage';

import { endBoard, ensureGameApiSuccess, requireGameApiData, submitMoves } from '../api/gameApi';

const FLUSH_INTERVAL_MS = 5000;
const defaultTimestampFactory = () => new Date().toISOString();

// ── Backend mutation barrier ─────────────────────────────────────────────────
// Module-level so it survives React 18 StrictMode double-mount.
// Every ordered backend call chains onto this promise, guaranteeing
// submitMoves → endBoard → nextBoard never run in parallel.
let _barrier: Promise<void> = Promise.resolve();

function _queueMutation<T>(task: () => Promise<T>): Promise<T> {
  const next = _barrier.then(task, task);
  _barrier = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

// ── Types ────────────────────────────────────────────────────────────────────
interface UseMoveSubmissionReturn {
  /** Record a tile move for the given round */
  pushMove: (slot: number, roundNumber: number) => void;
  /** Flush the given round's pending moves through the barrier */
  flushRound: (roundNumber: number) => Promise<void>;
  /** Flush every round's pending moves */
  flushAll: () => Promise<void>;
  /** Queue an endBoard call — runs after any pending move flushes */
  queueEndBoard: () => Promise<EndBoardResponse>;
  /** Start periodic auto-flush for the active round */
  startAutoFlush: (roundNumber: number) => void;
  /** Stop periodic auto-flush */
  stopAutoFlush: () => void;
  /** Restore pending moves from a recovered session */
  hydrateFromSession: (byRound: Record<string, GameMove[]>) => void;
  /** Reset all state for a new game session */
  reset: () => void;
  /** Snapshot of pending moves keyed by round — for session persistence */
  getPendingByRound: () => Record<string, GameMove[]>;
  pendingCount: number;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useMoveSubmission(
  createTimestamp: () => string = defaultTimestampFactory,
): UseMoveSubmissionReturn {
  const pendingByRound = useRef<Map<number, GameMove[]>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const updateCount = useCallback(() => {
    let total = 0;
    for (const moves of pendingByRound.current.values()) total += moves.length;
    setPendingCount(total);
  }, []);

  // ── Push move ──────────────────────────────────────────────────────────────
  const pushMove = useCallback(
    (slot: number, roundNumber: number) => {
      const move: GameMove = {
        slot,
        clickedAt: createTimestamp(),
        moveId: crypto.randomUUID(),
      };
      const existing = pendingByRound.current.get(roundNumber) ?? [];
      pendingByRound.current.set(roundNumber, [...existing, move]);
      updateCount();
      // Persist immediately so a refresh can recover unsubmitted moves
      void storage.appendPendingMove(roundNumber, move);
    },
    [createTimestamp, updateCount],
  );

  // ── Flush one round ────────────────────────────────────────────────────────
  const flushRound = useCallback(
    (roundNumber: number): Promise<void> => {
      const moves = pendingByRound.current.get(roundNumber) ?? [];
      if (moves.length === 0) return _barrier;

      pendingByRound.current.set(roundNumber, []);
      updateCount();

      return _queueMutation(async () => {
        try {
          ensureGameApiSuccess(await submitMoves(moves));
          // Remove submitted moves from persisted storage
          void storage.removePendingMoves(roundNumber, new Set(moves.map((m) => m.moveId)));
        } catch (err) {
          // Requeue at front on failure so they aren't lost
          const current = pendingByRound.current.get(roundNumber) ?? [];
          pendingByRound.current.set(roundNumber, [...moves, ...current]);
          updateCount();
          throw err;
        }
      });
    },
    [updateCount],
  );

  // ── Flush all rounds ───────────────────────────────────────────────────────
  const flushAll = useCallback(async (): Promise<void> => {
    for (const rn of [...pendingByRound.current.keys()]) {
      await flushRound(rn);
    }
  }, [flushRound]);

  // ── Queue endBoard ─────────────────────────────────────────────────────────
  const queueEndBoard = useCallback((): Promise<EndBoardResponse> => {
    const pendingSnapshot: Array<[number, GameMove[]]> = [...pendingByRound.current.entries()]
      .filter(([, moves]) => moves.length > 0)
      .map(([roundNumber, moves]) => [roundNumber, [...moves]]);

    for (const [roundNumber] of pendingSnapshot) {
      pendingByRound.current.set(roundNumber, []);
    }
    updateCount();

    return _queueMutation(async () => {
      const unsubmitted = new Map(pendingSnapshot);

      try {
        for (const [roundNumber, moves] of pendingSnapshot) {
          ensureGameApiSuccess(await submitMoves(moves));
          void storage.removePendingMoves(roundNumber, new Set(moves.map((m) => m.moveId)));
          unsubmitted.delete(roundNumber);
        }

        return requireGameApiData(await endBoard(), 'Failed to end board');
      } catch (err) {
        for (const [roundNumber, moves] of unsubmitted.entries()) {
          const current = pendingByRound.current.get(roundNumber) ?? [];
          pendingByRound.current.set(roundNumber, [...moves, ...current]);
        }
        updateCount();
        throw err;
      }
    });
  }, [updateCount]);

  // ── Auto-flush timer ───────────────────────────────────────────────────────
  const startAutoFlush = useCallback(
    (roundNumber: number) => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      flushTimerRef.current = setInterval(() => {
        void flushRound(roundNumber);
      }, FLUSH_INTERVAL_MS);
    },
    [flushRound],
  );

  const stopAutoFlush = useCallback(() => {
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  // ── Recovery hydration ─────────────────────────────────────────────────────
  const hydrateFromSession = useCallback(
    (byRound: Record<string, GameMove[]>) => {
      pendingByRound.current.clear();
      for (const [round, moves] of Object.entries(byRound)) {
        if (moves.length > 0) pendingByRound.current.set(Number(round), moves);
      }
      updateCount();
    },
    [updateCount],
  );

  // ── Reset for new session ──────────────────────────────────────────────────
  const reset = useCallback(() => {
    pendingByRound.current.clear();
    _barrier = Promise.resolve();
    updateCount();
  }, [updateCount]);

  // ── Snapshot for persistence ───────────────────────────────────────────────
  const getPendingByRound = useCallback((): Record<string, GameMove[]> => {
    const out: Record<string, GameMove[]> = {};
    for (const [rn, moves] of pendingByRound.current.entries()) {
      if (moves.length > 0) out[String(rn)] = moves;
    }
    return out;
  }, []);

  return {
    pushMove,
    flushRound,
    flushAll,
    queueEndBoard,
    startAutoFlush,
    stopAutoFlush,
    hydrateFromSession,
    reset,
    getPendingByRound,
    pendingCount,
  };
}
