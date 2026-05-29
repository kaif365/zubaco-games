import type { PendingLiveMove } from "@/components/custom/maze/maze-canvas-types";
import { MAZE_SUBMIT_MOVES_IDLE_FLUSH_MS } from "@/constants/maze";
import { useCallback, useEffect, useRef, type RefObject } from "react";

interface UseMazeLiveMoveFlushParams {
  readonly isLiveGameRef: RefObject<boolean>;
  readonly pendingLiveMovesRef: RefObject<PendingLiveMove[]>;
  readonly submitMoves: (body: { moves: PendingLiveMove[] }) => Promise<void>;
  readonly fetchStatus: () => Promise<unknown>;
}

export function useMazeLiveMoveFlush({
  isLiveGameRef,
  pendingLiveMovesRef,
  submitMoves,
  fetchStatus,
}: UseMazeLiveMoveFlushParams) {
  const isFlushInFlightRef = useRef(false);
  const idleFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingLiveMoves = useCallback(async (): Promise<void> => {
    if (!isLiveGameRef.current) {
      return;
    }
    if (isFlushInFlightRef.current) {
      return;
    }
    const moves = pendingLiveMovesRef.current.splice(0);
    if (moves.length === 0) {
      return;
    }
    isFlushInFlightRef.current = true;
    try {
      await submitMoves({ moves });
    } catch {
      pendingLiveMovesRef.current = [...moves, ...pendingLiveMovesRef.current];
      await fetchStatus().catch(() => {});
    } finally {
      isFlushInFlightRef.current = false;
    }
  }, [fetchStatus, isLiveGameRef, pendingLiveMovesRef, submitMoves]);

  const cancelIdleFlush = useCallback(() => {
    if (idleFlushTimerRef.current !== null) {
      globalThis.clearTimeout(idleFlushTimerRef.current);
      idleFlushTimerRef.current = null;
    }
  }, []);

  const scheduleIdleFlush = useCallback(() => {
    cancelIdleFlush();
    if (!isLiveGameRef.current) {
      return;
    }
    idleFlushTimerRef.current = globalThis.setTimeout(() => {
      idleFlushTimerRef.current = null;
      void flushPendingLiveMoves();
    }, MAZE_SUBMIT_MOVES_IDLE_FLUSH_MS);
  }, [cancelIdleFlush, flushPendingLiveMoves, isLiveGameRef]);

  const flushPendingLiveMovesImmediate =
    useCallback(async (): Promise<void> => {
      cancelIdleFlush();
      while (isFlushInFlightRef.current) {
        await new Promise<void>((resolve) => {
          globalThis.setTimeout(resolve, 16);
        });
      }
      await flushPendingLiveMoves();
      if (pendingLiveMovesRef.current.length > 0) {
        await flushPendingLiveMoves();
      }
    }, [cancelIdleFlush, flushPendingLiveMoves, pendingLiveMovesRef]);

  useEffect(() => () => cancelIdleFlush(), [cancelIdleFlush]);

  return {
    flushPendingLiveMoves,
    cancelIdleFlush,
    scheduleIdleFlush,
    flushPendingLiveMovesImmediate,
  };
}
