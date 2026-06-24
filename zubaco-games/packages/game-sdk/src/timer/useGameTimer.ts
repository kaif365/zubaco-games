// ─── Server-Authoritative Game Timer ────────────────────────────
// Syncs with backend to prevent client clock manipulation.
// Falls back to local timer if sync fails.

import { useState, useEffect, useRef, useCallback } from 'react';
import type { TimeSyncResponse } from '../api/client';

export interface UseGameTimerOptions {
  /** Total duration in milliseconds */
  durationMs: number;
  /** Server time when session started (epoch ms) */
  serverStartTime: number;
  /** Function to call server time-sync endpoint */
  syncFn?: () => Promise<TimeSyncResponse>;
  /** Sync interval in ms (default: 10000 = 10s) */
  syncInterval?: number;
  /** Warning threshold in ms (default: 30000 = 30s) */
  warningThreshold?: number;
  /** Called when time expires */
  onExpired?: () => void;
  /** Called when entering warning zone */
  onWarning?: (remainingMs: number) => void;
  /** Auto-start timer (default: true) */
  autoStart?: boolean;
}

export interface GameTimerState {
  /** Remaining time in milliseconds */
  remainingMs: number;
  /** Remaining time formatted as mm:ss */
  display: string;
  /** Whether timer is in warning zone */
  isWarning: boolean;
  /** Whether timer has expired */
  isExpired: boolean;
  /** Whether timer is actively counting down */
  isRunning: boolean;
  /** Elapsed time in milliseconds */
  elapsedMs: number;
  /** Progress (0-1, 1 = time up) */
  progress: number;
}

export interface GameTimerActions {
  /** Start the timer */
  start: () => void;
  /** Pause the timer */
  pause: () => void;
  /** Resume the timer */
  resume: () => void;
  /** Force sync with server */
  sync: () => Promise<void>;
}

export function useGameTimer(options: UseGameTimerOptions): [GameTimerState, GameTimerActions] {
  const {
    durationMs,
    serverStartTime,
    syncFn,
    syncInterval = 10_000,
    warningThreshold = 30_000,
    onExpired,
    onWarning,
    autoStart = true,
  } = options;

  // Server-client time offset (serverTime - clientTime)
  const offsetRef = useRef(0);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [isExpired, setIsExpired] = useState(false);
  const expiredRef = useRef(false);
  const warningFiredRef = useRef(false);
  const frameRef = useRef<number>(0);
  const lastSyncRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const pauseDurationRef = useRef(0);

  // Calculate remaining based on server-authoritative time
  const calculateRemaining = useCallback(() => {
    const now = Date.now() + offsetRef.current;
    const elapsed = now - serverStartTime - pauseDurationRef.current;
    return Math.max(0, durationMs - elapsed);
  }, [durationMs, serverStartTime]);

  // Sync with server
  const sync = useCallback(async () => {
    if (!syncFn) return;
    try {
      const beforeMs = Date.now();
      const response = await syncFn();
      const rtt = Date.now() - beforeMs;
      // Estimate server time at midpoint of request
      const estimatedServerTime = response.serverTime + rtt / 2;
      offsetRef.current = estimatedServerTime - Date.now();
      lastSyncRef.current = Date.now();
    } catch {
      // Sync failed — keep using last known offset
    }
  }, [syncFn]);

  // Animation frame loop for smooth countdown
  useEffect(() => {
    if (!isRunning || isExpired) return;

    const tick = () => {
      const remaining = calculateRemaining();
      setRemainingMs(remaining);

      // Check warning
      if (remaining <= warningThreshold && !warningFiredRef.current) {
        warningFiredRef.current = true;
        onWarning?.(remaining);
      }

      // Check expired
      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        setIsExpired(true);
        setIsRunning(false);
        onExpired?.();
        return;
      }

      // Periodic server sync
      if (syncFn && Date.now() - lastSyncRef.current > syncInterval) {
        sync();
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [isRunning, isExpired, calculateRemaining, syncFn, syncInterval, sync, onExpired, onWarning, warningThreshold]);

  // Initial sync on mount
  useEffect(() => {
    if (syncFn) sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
    pausedAtRef.current = Date.now();
  }, []);

  const resume = useCallback(() => {
    if (pausedAtRef.current) {
      pauseDurationRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    setIsRunning(true);
  }, []);

  // Format display
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const state: GameTimerState = {
    remainingMs,
    display,
    isWarning: remainingMs <= warningThreshold && remainingMs > 0,
    isExpired,
    isRunning,
    elapsedMs: durationMs - remainingMs,
    progress: Math.min(1, (durationMs - remainingMs) / durationMs),
  };

  const actions: GameTimerActions = { start, pause, resume, sync };

  return [state, actions];
}
