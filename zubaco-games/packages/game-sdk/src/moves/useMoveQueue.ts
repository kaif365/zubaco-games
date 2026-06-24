// ─── Move Queue with Batching & Crash Recovery ──────────────────
// Captures game moves, batches them, and submits to backend.
// Persists to localStorage for crash recovery.

import { useState, useEffect, useRef, useCallback } from 'react';

export interface MoveEntry {
  /** Unique move ID (UUID or sequence number) */
  id: string;
  /** Move type (game-specific) */
  type: string;
  /** Move data (game-specific) */
  data: Record<string, unknown>;
  /** Client timestamp when move was made */
  timestamp: number;
  /** Sequence number (auto-incremented) */
  seq: number;
}

export interface UseMoveQueueOptions {
  /** Game session ID (used for localStorage key) */
  sessionId: string;
  /** Function to submit a batch of moves to the server */
  submitFn: (moves: MoveEntry[]) => Promise<{ accepted: number }>;
  /** Max moves to batch before auto-flush (default: 10) */
  batchSize?: number;
  /** Max time between flushes in ms (default: 5000) */
  flushInterval?: number;
  /** Enable localStorage persistence (default: true) */
  persist?: boolean;
  /** Called when moves are successfully submitted */
  onFlushed?: (count: number) => void;
  /** Called on submission error */
  onError?: (error: unknown, moves: MoveEntry[]) => void;
}

export interface MoveQueueState {
  /** Number of moves in the pending queue */
  pendingCount: number;
  /** Total moves submitted successfully this session */
  totalSubmitted: number;
  /** Whether a flush is currently in progress */
  isFlushing: boolean;
  /** Last error, if any */
  lastError: unknown | null;
}

export interface MoveQueueActions {
  /** Add a move to the queue */
  push: (type: string, data: Record<string, unknown>) => MoveEntry;
  /** Force flush all pending moves */
  flush: () => Promise<void>;
  /** Clear all pending moves (use on game reset) */
  clear: () => void;
  /** Get all pending moves (for debugging or final submit) */
  getPending: () => MoveEntry[];
}

const STORAGE_PREFIX = 'zubaco_moves_';

export function useMoveQueue(options: UseMoveQueueOptions): [MoveQueueState, MoveQueueActions] {
  const {
    sessionId,
    submitFn,
    batchSize = 10,
    flushInterval = 5000,
    persist = true,
    onFlushed,
    onError,
  } = options;

  const storageKey = `${STORAGE_PREFIX}${sessionId}`;
  const seqRef = useRef(0);
  const queueRef = useRef<MoveEntry[]>([]);
  const flushingRef = useRef(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalSubmitted, setTotalSubmitted] = useState(0);
  const [isFlushing, setIsFlushing] = useState(false);
  const [lastError, setLastError] = useState<unknown | null>(null);

  // Recover from localStorage on mount
  useEffect(() => {
    if (!persist) return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const recovered: MoveEntry[] = JSON.parse(stored);
        if (recovered.length > 0) {
          queueRef.current = recovered;
          seqRef.current = Math.max(...recovered.map((m) => m.seq), 0);
          setPendingCount(recovered.length);
        }
      }
    } catch {
      // Corrupted data — ignore
    }
  }, [storageKey, persist]);

  // Persist to localStorage
  const persistQueue = useCallback(() => {
    if (!persist) return;
    try {
      if (queueRef.current.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(queueRef.current));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
      // Storage full or unavailable — continue without persistence
    }
  }, [storageKey, persist]);

  // Flush moves to server
  const flush = useCallback(async () => {
    if (flushingRef.current || queueRef.current.length === 0) return;

    flushingRef.current = true;
    setIsFlushing(true);

    const batch = [...queueRef.current];

    try {
      const result = await submitFn(batch);
      // Remove submitted moves from queue
      queueRef.current = queueRef.current.filter(
        (m) => !batch.some((b) => b.id === m.id),
      );
      setPendingCount(queueRef.current.length);
      setTotalSubmitted((prev) => prev + result.accepted);
      setLastError(null);
      persistQueue();
      onFlushed?.(result.accepted);
    } catch (err) {
      setLastError(err);
      onError?.(err, batch);
    } finally {
      flushingRef.current = false;
      setIsFlushing(false);
    }
  }, [submitFn, persistQueue, onFlushed, onError]);

  // Auto-flush on interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (queueRef.current.length > 0) flush();
    }, flushInterval);
    return () => clearInterval(interval);
  }, [flush, flushInterval]);

  // Flush on page unload (best-effort)
  useEffect(() => {
    const handleUnload = () => {
      persistQueue();
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [persistQueue]);

  const push = useCallback(
    (type: string, data: Record<string, unknown>): MoveEntry => {
      const move: MoveEntry = {
        id: crypto.randomUUID(),
        type,
        data,
        timestamp: Date.now(),
        seq: ++seqRef.current,
      };

      queueRef.current.push(move);
      setPendingCount(queueRef.current.length);
      persistQueue();

      // Auto-flush if batch size reached
      if (queueRef.current.length >= batchSize) {
        flush();
      }

      return move;
    },
    [batchSize, flush, persistQueue],
  );

  const clear = useCallback(() => {
    queueRef.current = [];
    setPendingCount(0);
    if (persist) localStorage.removeItem(storageKey);
  }, [storageKey, persist]);

  const getPending = useCallback(() => [...queueRef.current], []);

  const state: MoveQueueState = { pendingCount, totalSubmitted, isFlushing, lastError };
  const actions: MoveQueueActions = { push, flush, clear, getPending };

  return [state, actions];
}
