import { useEffect, useRef, useState } from 'react';

import type { useSessionTimeoutGame } from '@/features/sequence-recall/hooks/useGameCommands';
import { GAME_PHASE } from '@/types/game';
import type { GamePhase, GameState } from '@/types/game';

interface UseSessionTimerOptions {
  sessionTimerSeconds: number;
  /**
   * ISO-8601 timestamp from the server (game:start ack or first real round).
   * When provided, this is used as the authoritative end time instead of
   * computing one locally from sessionTimerSeconds.
   */
  endTime?: string | null;
  /**
   * When true the timer ticks for display but does NOT call sessionTimeoutGame
   * when it reaches zero. Use this when the server drives game-over via a
   * game:game_over push (prevents a double-trigger race between local timeout
   * and the server push).
   */
  skipLocalTimeout?: boolean;
  /**
   * When false the timer will not start even if the phase is active.
   * Use this to suppress the timer during demo rounds (round === 0).
   */
  enabled?: boolean;
  state: GameState | undefined;
  sessionTimeoutGame: ReturnType<typeof useSessionTimeoutGame>;
}

interface UseSessionTimerReturn {
  sessionTimeLeft: number | null;
  sessionTimerDisplay: number | null;
  sessionTimerWarning: boolean;
  sessionTimerCritical: boolean;
  resetTimer: () => void;
}

const ACTIVE_PHASES: GamePhase[] = [
  GAME_PHASE.SHOWING_SEQUENCE,
  GAME_PHASE.AWAITING_INPUT,
  GAME_PHASE.ROUND_SUCCESS,
  GAME_PHASE.ROUND_FAILURE,
];
const END_PHASES: GamePhase[] = [
  GAME_PHASE.GAME_OVER,
  GAME_PHASE.SESSION_COMPLETE,
  GAME_PHASE.READY,
];

/**
 * Hook for session timer.
 *
 * @param {UseSessionTimerOptions} options - Function options.
 * @param {number} options.sessionTimerSeconds - The session timer seconds.
 * @param {string | null | undefined} [options.endTime] - The end time.
 * @param {boolean | undefined} [options.skipLocalTimeout] - The skip local timeout.
 * @param {boolean | undefined} [options.enabled] - The enabled.
 * @param {GameState | undefined} options.state - The state.
 * @param {Override<MutationObserverResult<GameState, Error, void, unknown>, { mutate: UseMutateFunction<GameState, Error, void, unknown>; }> & { mutateAsync: UseMutateAsyncFunction<GameState, Error, void, unknown>; }} options.sessionTimeoutGame - The session timeout game.
 *
 * @returns {UseSessionTimerReturn} The result of useSessionTimer.
 */
export function useSessionTimer({
  sessionTimerSeconds,
  endTime,
  skipLocalTimeout = false,
  enabled = true,
  state,
  sessionTimeoutGame,
}: UseSessionTimerOptions): UseSessionTimerReturn {
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number | null>(null);
  const sessionEndTimeRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionTimerActiveRef = useRef(false);

  // When the server provides endTime (from game:start ack), switch the target
  // immediately — even if the tick loop is already running.
  useEffect(() => {
    if (!endTime) return;
    const ms = new Date(endTime).getTime();
    if (!isNaN(ms)) {
      sessionEndTimeRef.current = ms;
    }
  }, [endTime]);

  useEffect(() => {
    if (!state || sessionTimerSeconds <= 0) return;

    if (!enabled && sessionTimerActiveRef.current) {
      sessionTimerActiveRef.current = false;
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      sessionEndTimeRef.current = null;
      setSessionTimeLeft(null);
      return;
    }

    if (ACTIVE_PHASES.includes(state.phase) && !sessionTimerActiveRef.current) {
      if (!enabled) return; // suppressed (e.g. demo round — wait for real round 1)
      sessionTimerActiveRef.current = true;

      // Use the server end time when available; fall back to a locally-computed one
      if (!sessionEndTimeRef.current) {
        sessionEndTimeRef.current = endTime
          ? new Date(endTime).getTime()
          : Date.now() + sessionTimerSeconds * 1_000;
      }

      /**
       * Tick.
       *
       * @returns {void} No return value.
       */
      const tick = () => {
        if (!sessionEndTimeRef.current) return;
        const remaining = Math.max(0, Math.ceil((sessionEndTimeRef.current - Date.now()) / 1_000));
        setSessionTimeLeft(remaining);
      };
      tick();
      sessionTimerRef.current = setInterval(tick, 250);
    }

    if (END_PHASES.includes(state.phase)) {
      sessionTimerActiveRef.current = false;
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      sessionEndTimeRef.current = null;
      setSessionTimeLeft(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, sessionTimerSeconds, enabled]);

  useEffect(() => {
    if (
      sessionTimeLeft === 0 &&
      state?.phase &&
      !(
        [
          GAME_PHASE.GAME_OVER,
          GAME_PHASE.SESSION_COMPLETE,
          GAME_PHASE.READY,
          GAME_PHASE.LOADING,
        ] as GamePhase[]
      ).includes(state.phase) &&
      !sessionTimeoutGame.isPending &&
      !skipLocalTimeout // server drives game-over when socket session is active
    ) {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      void sessionTimeoutGame.mutateAsync();
    }
  }, [sessionTimeLeft, state?.phase, sessionTimeoutGame, skipLocalTimeout]);

  useEffect(() => {
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, []);

  /**
   * Reset timer.
   *
   * @returns {void} No return value.
   */
  const resetTimer = () => {
    sessionTimerActiveRef.current = false;
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
    sessionEndTimeRef.current = null;
    setSessionTimeLeft(null);
  };

  const sessionTimerDisplay =
    sessionTimerSeconds > 0 && sessionTimeLeft !== null ? sessionTimeLeft : null;
  const sessionTimerWarning = sessionTimerDisplay !== null && sessionTimerDisplay <= 10;
  const sessionTimerCritical = sessionTimerDisplay !== null && sessionTimerDisplay <= 5;

  return {
    sessionTimeLeft,
    sessionTimerDisplay,
    sessionTimerWarning,
    sessionTimerCritical,
    resetTimer,
  };
}
