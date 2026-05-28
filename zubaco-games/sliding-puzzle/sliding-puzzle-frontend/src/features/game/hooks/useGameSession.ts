import { useCallback, useEffect, useRef, useState } from 'react';

import { isSolvedBoard, moveTile } from '@/lib/sliding-puzzle/board';
import { getAuthToken, setAuthToken } from '@/services/httpClient';
import type {
  GameBoard,
  GameMove,
  GameScoreboard,
  GameStatusResponse,
  GameStatusValue,
  RoundScore,
} from '@/types/sliding-puzzle';
import { GameStatus } from '@/types/sliding-puzzle';
import { storage } from '@/utils/storage';

import {
  endGame,
  ensureGameApiSuccess,
  gameStart,
  getGameStatus,
  getNextBoard,
  requireGameApiData,
} from '../api/gameApi';

import { useBoardPrefetch } from './useBoardPrefetch';
import { useMoveSubmission } from './useMoveSubmission';

// ── Phase ────────────────────────────────────────────────────────────────────
export type GamePhase =
  | 'idle'
  | 'loading'
  | 'memorizing'
  | 'shuffle-animation'
  | 'playing'
  | 'board-clearing'
  | 'loading-next'
  | 'revealing'
  | 'calculating_result'
  | 'completed'
  | 'expired'
  | 'error';

// ── Board UI State ───────────────────────────────────────────────────────────
export interface BoardState {
  board: GameBoard;
  pieces: number[];
  totalRounds: number;
}

// ── Hook Return ──────────────────────────────────────────────────────────────
export interface UseGameSessionReturn {
  phase: GamePhase;
  boardState: BoardState | null;
  expiryAtMs: number | null;
  remainingMs: number;
  roundScores: RoundScore[];
  scoreboard: GameScoreboard | null;
  finalStatus: number | null;
  error: string | null;
  isOnline: boolean;
  isAllRoundsCleared: boolean;
  pendingCount: number;
  flushAll: () => Promise<void>;
  startGame: () => Promise<void>;
  handleTileClick: (slot: number) => void;
  onMemorizeComplete: () => void;
  onShuffleAnimationComplete: () => void;
  onRevealComplete: () => void;
  forfeit: () => Promise<void>;
  autoSolve: () => void;
}

const TERMINAL_STATUSES: Set<GameStatusValue> = new Set([
  GameStatus.ENDED,
  GameStatus.EXPIRED,
  GameStatus.MANUALLY_ENDED,
]);

interface ClearDataEnvelope {
  message?: string;
  statusCode?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asClearDataEnvelope(value: unknown): ClearDataEnvelope | null {
  if (!isRecord(value)) return null;

  const data = isRecord(value.data) ? value.data : null;
  if (!data || data.clearData !== true) return null;

  return {
    message: typeof value.message === 'string' ? value.message : undefined,
    statusCode: typeof value.statusCode === 'number' ? value.statusCode : undefined,
  };
}

function extractClearDataEnvelope(value: unknown): ClearDataEnvelope | null {
  const direct = asClearDataEnvelope(value);
  if (direct) return direct;

  if (isRecord(value)) {
    const wrappedEnvelope = asClearDataEnvelope(value.envelope);
    if (wrappedEnvelope) return wrappedEnvelope;
  }

  if (!isRecord(value) || !isRecord(value.response)) {
    return null;
  }

  const responseEnvelope = asClearDataEnvelope(value.response.data);
  if (!responseEnvelope) return null;

  return {
    ...responseEnvelope,
    statusCode:
      responseEnvelope.statusCode ??
      (typeof value.response.status === 'number' ? value.response.status : undefined),
  };
}

function getErrorMessage(value: unknown, fallback: string): string {
  if (value instanceof Error && value.message) return value.message;
  if (isRecord(value) && typeof value.message === 'string') return value.message;

  if (isRecord(value) && isRecord(value.response) && isRecord(value.response.data)) {
    const responseData = value.response.data;
    if (typeof responseData.message === 'string') return responseData.message;
  }

  return fallback;
}

function parseTimestampMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

export function useGameSession(): UseGameSessionReturn {
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [boardState, setBoardState] = useState<BoardState | null>(null);
  const [expiryAtMs, setExpiryAtMs] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [roundScores, setRoundScores] = useState<RoundScore[]>([]);
  const [scoreboard, setScoreboard] = useState<GameScoreboard | null>(null);
  const [finalStatus, setFinalStatus] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAllRoundsCleared, setIsAllRoundsCleared] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearingRef = useRef(false);
  // Prevents concurrent finalization (timer expiry vs board-clear race)
  const finalizingRef = useRef(false);
  const revealCompletionRef = useRef<(() => Promise<void>) | null>(null);
  // Set when the timer reaches 0 while the device is offline — defers all API
  // calls until the user is back online and taps Retry.
  const timedOutOfflineRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartedAtRef = useRef<string | null>(null);
  const serverStartedAtMsRef = useRef<number | null>(null);
  const clientStartedAtMsRef = useRef<number | null>(null);

  const anchorSessionClock = useCallback(
    (startedAt?: string | null, clientStartedAtMs?: number | null) => {
      const startedAtMs = parseTimestampMs(startedAt);
      serverStartedAtMsRef.current = startedAtMs;
      clientStartedAtMsRef.current =
        startedAtMs === null
          ? null
          : typeof clientStartedAtMs === 'number' && Number.isFinite(clientStartedAtMs)
            ? clientStartedAtMs
            : Date.now();
    },
    [],
  );

  const clearSessionClock = useCallback(() => {
    sessionIdRef.current = null;
    sessionStartedAtRef.current = null;
    serverStartedAtMsRef.current = null;
    clientStartedAtMsRef.current = null;
  }, []);

  const getServerAnchoredTimestamp = useCallback(() => {
    const serverStartedAtMs = serverStartedAtMsRef.current;
    const clientStartedAtMs = clientStartedAtMsRef.current;

    if (serverStartedAtMs === null || clientStartedAtMs === null) {
      return new Date().toISOString();
    }

    const elapsedMs = Math.max(0, Date.now() - clientStartedAtMs);
    return new Date(serverStartedAtMs + elapsedMs).toISOString();
  }, []);

  const moveSubmission = useMoveSubmission(getServerAnchoredTimestamp);
  const prefetch = useBoardPrefetch();

  // ── Online / offline tracking ─────────────────────────────────────────────
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
    };
    const onOffline = () => {
      setIsOnline(false);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // ── Expiry timer ──────────────────────────────────────────────────────────
  const startExpiryTimer = useCallback((expiryMs: number) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const tick = () => {
      const left = Math.max(0, expiryMs - Date.now());
      setRemainingMs(left);
      if (left <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    tick();
    timerRef.current = setInterval(tick, 250);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      moveSubmission.stopAutoFlush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handle game end ───────────────────────────────────────────────────────
  const handleGameEnd = useCallback(
    (status: GameStatusResponse) => {
      stopTimer();
      moveSubmission.stopAutoFlush();
      clearSessionClock();
      setScoreboard(status.scoreboard ?? null);
      setFinalStatus(status.status);

      if (status.scoreboard?.rounds) {
        setRoundScores(status.scoreboard.rounds);
      }

      setPhase(
        status.status === GameStatus.ENDED || status.status === GameStatus.MANUALLY_ENDED
          ? 'completed'
          : 'expired',
      );
    },
    [clearSessionClock, moveSubmission, stopTimer],
  );

  const handleClearDataGameSession = useCallback(
    (source: unknown) => {
      const envelope = extractClearDataEnvelope(source);
      if (!envelope) return false;

      stopTimer();
      moveSubmission.stopAutoFlush();
      moveSubmission.reset();
      storage.clearLiveSession();
      setAuthToken(null); // drop stale token so next auth call fetches a fresh one
      clearSessionClock();
      clearingRef.current = false;
      finalizingRef.current = false;
      revealCompletionRef.current = null;
      setBoardState(null);
      setExpiryAtMs(null);
      setRemainingMs(0);
      setIsAllRoundsCleared(false);
      setError(envelope.message ?? 'Game session not found. Please start again.');
      setPhase('error');
      return true;
    },
    [clearSessionClock, moveSubmission, stopTimer],
  );

  const buildLiveSessionSnapshot = useCallback(
    (
      board: GameBoard,
      totalRounds: number,
      expiryAt: string,
      pieces: number[],
      phase: 'memorizing' | 'playing',
      pendingMovesByRound: Record<string, GameMove[]>,
    ) => ({
      token: getAuthToken() ?? '',
      sessionId: sessionIdRef.current,
      expiryAt,
      startedAt: sessionStartedAtRef.current,
      clientStartedAtMs: clientStartedAtMsRef.current,
      capturedAtMs: Date.now(),
      totalRounds,
      currentRound: board.roundNumber,
      board,
      pieces,
      phase,
      pendingMovesByRound,
    }),
    [],
  );

  // ── Load a board ──────────────────────────────────────────────────────────
  // recoveredPieces / recoveredPhase are only passed during session recovery
  // so the player picks up exactly where they left off.
  const loadBoard = useCallback(
    (
      board: GameBoard,
      totalRounds: number,
      recoveredPieces?: number[],
      recoveredPhase?: 'memorizing' | 'playing',
    ) => {
      const pieces = recoveredPieces ?? [...board.pieces];
      setBoardState({ board, pieces, totalRounds });
      clearingRef.current = false;
      moveSubmission.startAutoFlush(board.roundNumber);
      prefetch.reset();
      prefetch.tryPrefetch(board.roundNumber, totalRounds);

      if (recoveredPhase) {
        setPhase(recoveredPhase);
      } else {
        setPhase(board.displayTime > 0 ? 'memorizing' : 'shuffle-animation');
      }
    },
    [moveSubmission, prefetch],
  );

  const retryBackendStep = useCallback(async <T>(task: () => Promise<T>): Promise<T> => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        return await task();
      } catch (err) {
        lastError = err;

        // If the server explicitly asked to clear data (session not found/expired),
        // there is no point in retrying.
        if (extractClearDataEnvelope(err)) {
          throw err;
        }

        if (attempt < 2) {
          await new Promise((resolve) => {
            setTimeout(resolve, 500);
          });
        }
      }
    }
    throw lastError;
  }, []);

  // ── Finalize expired session ──────────────────────────────────────────────
  const finalizeExpiredSession = useCallback(async () => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;

    setPhase('calculating_result');
    stopTimer();
    moveSubmission.stopAutoFlush();

    // Tracks whether finalization fully completed (success) or the server
    // explicitly invalidated the session (clearData). Only in these cases should
    // the persisted session be cleared. A plain network failure intentionally
    // keeps the session alive so the Retry flow can re-attempt finalization.
    let sessionFinalized = false;
    try {
      await retryBackendStep(() => moveSubmission.flushAll());
      const endBoardResult = await retryBackendStep(() => moveSubmission.queueEndBoard());
      if (boardState) {
        setRoundScores((prev) => [
          ...prev,
          { roundNumber: boardState.board.roundNumber, score: endBoardResult.roundScore },
        ]);
      }

      // If the last board already triggered game over, we don't need to call endGame (forfeit).
      // If we do call it, we catch "session not found" errors to proceed to getGameStatus.
      if (!endBoardResult.gameOver) {
        try {
          await retryBackendStep(async () => {
            ensureGameApiSuccess(await endGame());
          });
        } catch (err) {
          if (!extractClearDataEnvelope(err)) {
            throw err;
          }
          // If session is already gone (404), we'll try fetching status anyway
        }
      }

      const status = await retryBackendStep(async () =>
        requireGameApiData(await getGameStatus(), 'Failed to fetch final status'),
      );
      handleGameEnd(status);
      sessionFinalized = true;
    } catch (err) {
      if (handleClearDataGameSession(err)) {
        // clearData handler already cleared the session — nothing left to clean up.
        sessionFinalized = true;
        return;
      }

      // Network / server error: the game timed out but we could not reach the
      // server to collect the result. Keep the persisted session so that tapping
      // Retry re-enters the expired-session recovery path and finalizes properly.
      setBoardState(null);
      setExpiryAtMs(null);
      setError("Time's up — lost connection while fetching your results. Please retry to see your final score.");
      setPhase('error');
    } finally {
      finalizingRef.current = false;
      if (sessionFinalized) {
        storage.clearLiveSession();
      }
    }
  }, [
    boardState,
    handleClearDataGameSession,
    handleGameEnd,
    moveSubmission,
    retryBackendStep,
    stopTimer,
  ]);

  // ── Timer expiry effect ───────────────────────────────────────────────────
  useEffect(() => {
    if (remainingMs <= 0 && expiryAtMs && phase === 'playing') {
      stopTimer();
      if (isOnline) {
        void finalizeExpiredSession();
      } else {
        // Offline — don't touch any API. Preserve the session so that when the
        // user reconnects and taps Retry, startGame() recovery path picks it up
        // and finalizes it properly.
        timedOutOfflineRef.current = true;
        moveSubmission.stopAutoFlush();
        setPhase('error');
        setError("Time's up — you appear to be offline. Reconnect and tap Retry to see your results.");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs, expiryAtMs, phase]);

  // ── Start game ────────────────────────────────────────────────────────────
  const startGame = useCallback(async () => {
    timedOutOfflineRef.current = false;
    setPhase('loading');
    setError(null);
    setRoundScores([]);
    setScoreboard(null);
    setFinalStatus(null);
    setIsAllRoundsCleared(false);
    moveSubmission.reset();

    // ── Session recovery ─────────────────────────────────────────────────────
    // Attempt to recover a valid persisted session.
    // On any failure (network, stale data, no active game) we clear the
    // session and fall through to a normal gameStart() call.
    const persisted = await storage.readLiveSession();
    if (persisted) {
      // Restore auth token first so all subsequent API calls are authenticated
      if (persisted.token) {
        setAuthToken(persisted.token);
      }
      sessionIdRef.current = persisted.sessionId;
      sessionStartedAtRef.current = persisted.startedAt;
      anchorSessionClock(persisted.startedAt, persisted.clientStartedAtMs);

      const expMs = Date.parse(persisted.expiryAt);
      const isExpired = Number.isNaN(expMs) || expMs <= Date.now();

      if (!isExpired) {
        try {
          const status = requireGameApiData(await getGameStatus(), 'Failed to recover game status');
          if (TERMINAL_STATUSES.has(status.status)) {
            // Session already ended on server — show result and stop
            handleGameEnd(status);
            storage.clearLiveSession();
            return;
          }
          const recoveredStartedAt = status.startedAt ?? persisted.startedAt;
          const recoveredExpiryAt = status.expiryAt ?? persisted.expiryAt;
          const recoveredExpMs = Date.parse(recoveredExpiryAt);
          sessionIdRef.current = status.sessionId ?? persisted.sessionId;
          sessionStartedAtRef.current = recoveredStartedAt;
          anchorSessionClock(
            recoveredStartedAt,
            parseTimestampMs(recoveredStartedAt) === parseTimestampMs(persisted.startedAt)
              ? persisted.clientStartedAtMs
              : undefined,
          );

          if (Number.isNaN(recoveredExpMs) || recoveredExpMs <= Date.now()) {
            moveSubmission.hydrateFromSession(persisted.pendingMovesByRound);
            setBoardState({
              board: persisted.board,
              pieces: persisted.pieces,
              totalRounds: persisted.totalRounds,
            });
            setExpiryAtMs(Number.isNaN(recoveredExpMs) ? null : recoveredExpMs);
            void finalizeExpiredSession();
            return;
          }

          // Valid active session — hydrate pending moves and resume exactly
          // where the player left off (same pieces, same phase)
          moveSubmission.hydrateFromSession(persisted.pendingMovesByRound);
          setExpiryAtMs(recoveredExpMs);
          startExpiryTimer(recoveredExpMs);
          loadBoard(persisted.board, persisted.totalRounds, persisted.pieces, persisted.phase);
          void storage.saveLiveSession(
            buildLiveSessionSnapshot(
              persisted.board,
              persisted.totalRounds,
              recoveredExpiryAt,
              persisted.pieces,
              persisted.phase,
              persisted.pendingMovesByRound,
            ),
          );
          return;
        } catch (err) {
          if (handleClearDataGameSession(err)) return;

          // If status validation is unavailable, keep the local recovery state.
          // The next queued mutation/status call will reconcile with the server.
          moveSubmission.hydrateFromSession(persisted.pendingMovesByRound);
          setExpiryAtMs(expMs);
          startExpiryTimer(expMs);
          loadBoard(persisted.board, persisted.totalRounds, persisted.pieces, persisted.phase);
          return;
        }
      } else {
        // Session expired locally — flush any pending moves and finalize
        moveSubmission.hydrateFromSession(persisted.pendingMovesByRound);
        setBoardState({
          board: persisted.board,
          pieces: persisted.pieces,
          totalRounds: persisted.totalRounds,
        });
        setExpiryAtMs(Number.isNaN(expMs) ? null : expMs);
        void finalizeExpiredSession();
        return;
      }

      // Unrecoverable — clear before fresh start
      storage.clearLiveSession();
    }

    // ── Normal game start ────────────────────────────────────────────────────
    clearSessionClock();
    try {
      const session = requireGameApiData(await gameStart(), 'Failed to start game');

      if (TERMINAL_STATUSES.has(session.status)) {
        const status = requireGameApiData(await getGameStatus(), 'Failed to fetch game status');
        handleGameEnd(status);
        return;
      }

      if (session.status === GameStatus.RESULT_PROCESSING) {
        setError('Game result is being processed. Please try again shortly.');
        setPhase('idle');
        return;
      }

      const expMs = new Date(session.expiryAt).getTime();
      sessionIdRef.current = session.sessionId ?? null;
      sessionStartedAtRef.current = session.startedAt ?? null;
      anchorSessionClock(session.startedAt ?? null);
      setExpiryAtMs(expMs);
      startExpiryTimer(expMs);
      loadBoard(session.board, session.totalRounds);

      void storage.saveLiveSession(
        buildLiveSessionSnapshot(
          session.board,
          session.totalRounds,
          session.expiryAt,
          [...session.board.pieces],
          session.board.displayTime > 0 ? 'memorizing' : 'playing',
          {},
        ),
      );
    } catch (err: unknown) {
      if (handleClearDataGameSession(err)) return;
      setError(getErrorMessage(err, 'Failed to start game'));
      setPhase('error');
    }
  }, [
    anchorSessionClock,
    buildLiveSessionSnapshot,
    clearSessionClock,
    finalizeExpiredSession,
    handleClearDataGameSession,
    handleGameEnd,
    loadBoard,
    moveSubmission,
    startExpiryTimer,
  ]);

  // ── Memorize complete ─────────────────────────────────────────────────────
  const onMemorizeComplete = useCallback(() => {
    setPhase('shuffle-animation');
  }, []);

  const onShuffleAnimationComplete = useCallback(() => {
    setPhase('playing');
    // Persist that memorizing is done — so a refresh during play doesn't show it again
    void storage.updateSessionPhase('playing');
  }, []);

  const onRevealComplete = useCallback(() => {
    const callback = revealCompletionRef.current;
    if (!callback) return;
    revealCompletionRef.current = null;
    callback().catch((err: unknown) => {
      console.error('[game] reveal completion failed', err);
    });
  }, []);

  // ── Board cleared ─────────────────────────────────────────────────────────
  const onBoardCleared = useCallback(async () => {
    if (clearingRef.current || finalizingRef.current || !boardState) return;
    clearingRef.current = true;

    setPhase('revealing');

    const currentRound = boardState.board.roundNumber;
    const isLastBoard = currentRound >= boardState.totalRounds;
    const totalRounds = boardState.totalRounds;

    if (isLastBoard) {
      const endBoardPromise = moveSubmission.queueEndBoard();
      setIsAllRoundsCleared(true);

      revealCompletionRef.current = async () => {
        setPhase('calculating_result');
        try {
          const result = await endBoardPromise;
          setRoundScores((prev) => [
            ...prev,
            { roundNumber: currentRound, score: result.roundScore },
          ]);
          if (result.gameOver) {
            const status = requireGameApiData(await getGameStatus(), 'Failed to fetch game status');
            handleGameEnd(status);
            storage.clearLiveSession();
          }
        } catch (err) {
          if (handleClearDataGameSession(err)) return;
          console.error('[game] Failed to end last board:', err);
        }
      };
    } else {
      // Non-last board: kick off the end-board request in parallel with the
      // reveal animation, then load the next board after reveal completes.
      const endBoardPromise = moveSubmission.queueEndBoard();

      revealCompletionRef.current = async () => {
        setPhase('loading-next');
        try {
          const result = await endBoardPromise;
          setRoundScores((prev) => [
            ...prev,
            { roundNumber: currentRound, score: result.roundScore },
          ]);

          if (result.gameOver) {
            const status = requireGameApiData(await getGameStatus(), 'Failed to fetch game status');
            handleGameEnd(status);
            storage.clearLiveSession();
            return;
          }

          // awaitBoard() joins any in-flight prefetch instead of firing a second request.
          // Falls back to a direct call only if no prefetch was started or it failed.
          const prefetched = await prefetch.awaitBoard();
          const next =
            prefetched ?? requireGameApiData(await getNextBoard(), 'Failed to load next board');

          // Persist new board state while keeping unsent moves from the solved round
          // until queueEndBoard successfully submits and removes them.
          const pendingMovesByRound =
            (await storage.readLiveSession())?.pendingMovesByRound ?? moveSubmission.getPendingByRound();
          if (expiryAtMs) {
            void storage.saveLiveSession(
              buildLiveSessionSnapshot(
                next,
                totalRounds,
                new Date(expiryAtMs).toISOString(),
                [...next.pieces],
                next.displayTime > 0 ? 'memorizing' : 'playing',
                pendingMovesByRound,
              ),
            );
          }

          loadBoard(next, totalRounds);
        } catch (err) {
          if (handleClearDataGameSession(err)) return;

          setError(getErrorMessage(err, 'Failed to load next board'));
          setPhase('error');
        }
      };
    }
  }, [
    boardState,
    buildLiveSessionSnapshot,
    expiryAtMs,
    handleClearDataGameSession,
    handleGameEnd,
    loadBoard,
    moveSubmission,
    prefetch,
  ]);

  useEffect(() => {
    if (phase === 'playing' && boardState && isSolvedBoard(boardState.pieces)) {
      void onBoardCleared();
    }
  }, [boardState, onBoardCleared, phase]);

  // ── Handle tile click ─────────────────────────────────────────────────────
  const handleTileClick = useCallback(
    (slot: number) => {
      if (phase !== 'playing' || !boardState) return;

      const { pieces } = boardState;
      const columns = boardState.board.gridSize.x;

      if (pieces[slot] === -1) return;

      const result = moveTile(pieces, slot, columns);
      if (!result.moved) return;

      const nextPieces = result.board;
      setBoardState((prev) => (prev ? { ...prev, pieces: nextPieces } : prev));

      moveSubmission.pushMove(slot, boardState.board.roundNumber);

      // Keep persisted pieces in sync so recovery restores the exact board state
      void storage.updateSessionPieces(nextPieces);

      if (isSolvedBoard(nextPieces)) {
        void onBoardCleared();
      }
    },
    [boardState, moveSubmission, onBoardCleared, phase],
  );

  // ── Forfeit ───────────────────────────────────────────────────────────────
  const forfeit = useCallback(async () => {
    stopTimer();
    moveSubmission.stopAutoFlush();

    try {
      await moveSubmission.flushAll();
      ensureGameApiSuccess(await endGame());
      const status = requireGameApiData(await getGameStatus(), 'Failed to fetch game status');
      handleGameEnd(status);
    } catch (err: unknown) {
      if (handleClearDataGameSession(err)) return;
      setError(getErrorMessage(err, 'Forfeit failed'));
    } finally {
      storage.clearLiveSession();
    }
  }, [handleClearDataGameSession, handleGameEnd, moveSubmission, stopTimer]);

  // ── Auto solve (devtools) ─────────────────────────────────────────────────
  const autoSolve = useCallback(() => {
    if (phase !== 'playing' || !boardState) return;

    const n = boardState.pieces.length;
    const columns = boardState.board.gridSize.x;
    const pieces = Array.from({ length: n }, (_, i) => (i === n - 1 ? -1 : i));

    // To leave exactly 3 moves left, we perform 3 valid "backwards" swaps.
    // Path: n-1 (Start) -> n-2 (Left) -> n-2-cols (Up) -> n-1-cols (Right)
    if (n >= columns * 2 && columns >= 2) {
      const i1 = n - 1;
      const i2 = n - 2;
      const i3 = i2 - columns;
      const i4 = i3 + 1; // which is n - 1 - columns

      // 1. Swap empty slot (i1) with tile at i2 (Move Empty to i2)
      [pieces[i1], pieces[i2]] = [pieces[i2], pieces[i1]];
      // 2. Swap empty slot (i2) with tile at i3 (Move Empty to i3)
      [pieces[i2], pieces[i3]] = [pieces[i3], pieces[i2]];
      // 3. Swap empty slot (i3) with tile at i4 (Move Empty to i4)
      [pieces[i3], pieces[i4]] = [pieces[i4], pieces[i3]];
    } else if (n >= 2) {
      // Fallback for very small boards
      [pieces[n - 1], pieces[n - 2]] = [pieces[n - 2], pieces[n - 1]];
    }

    setBoardState((prev) => (prev ? { ...prev, pieces } : prev));

    // Sync with storage so a refresh doesn't lose the auto-solve progress
    void storage.updateSessionPieces(pieces);

    // We no longer call onBoardCleared() here. The user must click the last tile
    // to solve the puzzle and trigger the success flow.
  }, [boardState, phase]);

  return {
    phase,
    boardState,
    expiryAtMs,
    remainingMs,
    roundScores,
    scoreboard,
    finalStatus,
    error,
    isOnline,
    isAllRoundsCleared,
    pendingCount: moveSubmission.pendingCount,
    flushAll: moveSubmission.flushAll,
    startGame,
    handleTileClick,
    onMemorizeComplete,
    onShuffleAnimationComplete,
    onRevealComplete,
    forfeit,
    autoSolve,
  };
}
