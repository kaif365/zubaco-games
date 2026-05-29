import { useCallback, useEffect, useRef, useState } from 'react';
import i18next from 'i18next';
import { simulateLaser } from '@/game/laserEngine';
import { getAuthToken, setAuthToken } from '@/services/httpClient';
import type {
  BlockType,
  GameLevel,
  GameScoreboard,
  GameStatusResponse,
  GameStatusValue,
  LevelScore,
  PlacedBlock,
} from '@/types/logic-reflector';
import { GameStatus } from '@/types/logic-reflector';
import { storage } from '@/utils/storage';
import {
  endGame,
  ensureGameApiSuccess,
  gameStart,
  getGameStatus,
  getNextLevel,
  requireGameApiData,
} from '../api/gameApi';
import { createEmptyBlockCounts, getLevelAvailableBlocks } from '../utils/levelBlocks';
import { useLevelPrefetch } from './useLevelPrefetch';
import { useMoveSubmission } from './useMoveSubmission';

// ── Phase ─────────────────────────────────────────────────────────────────────
export type GamePhase =
  | 'idle'
  | 'loading'
  | 'level-opening'
  | 'playing'
  | 'level-clearing'
  | 'loading-next'
  | 'calculating_result'
  | 'completed'
  | 'error';

// ── Board state ───────────────────────────────────────────────────────────────
export interface BoardState {
  level: GameLevel;
  placedBlocks: PlacedBlock[];
  totalLevels: number;
  /** Keys of currently lit targets from laser simulation */
  litTargetKeys: Set<string>;
  allTargetsLit: boolean;
}

export interface UseGameSessionReturn {
  phase: GamePhase;
  boardState: BoardState | null;
  levelScores: LevelScore[];
  scoreboard: GameScoreboard | null;
  finalStatus: GameStatusValue | null;
  error: string | null;
  selectedBlock: BlockType | null;
  availableBlockCounts: Record<BlockType, number>;
  /** Remaining seconds in the current session (0 when idle or expired) */
  timerSeconds: number;
  startGame: () => Promise<void>;
  selectBlock: (type: BlockType | null) => void;
  handleCellClick: (row: number, col: number) => void;
  handleCellRemove: (row: number, col: number) => void;
  handleDrop: (
    toRow: number,
    toCol: number,
    blockType: BlockType,
    fromRow: number,
    fromCol: number,
  ) => void;
  forfeit: () => Promise<void>;
}

const TERMINAL = new Set<GameStatusValue>([
  GameStatus.ENDED,
  GameStatus.EXPIRED,
  GameStatus.MANUALLY_ENDED,
]);

const LEVEL_OPEN_ANIMATION_MS = 1100;
const LEVEL_CLEAR_HOLD_MS = 1500;
const LEVEL_CLOSE_ANIMATION_MS = 950;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isClearData(v: unknown): boolean {
  if (!isRecord(v)) return false;
  const data = isRecord(v.data) ? v.data : null;
  if (data?.clearData === true) return true;
  if (isRecord(v.envelope)) return isClearData(v.envelope);
  if (isRecord(v.response)) return isClearData((v.response as Record<string, unknown>).data);
  return false;
}

function getErrMsg(v: unknown, fallback: string): string {
  if (v instanceof Error) return v.message;
  if (isRecord(v) && typeof v.message === 'string') return v.message;
  return fallback;
}

function parseTimestampMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

function computeLitTargets(level: GameLevel, placed: PlacedBlock[]): Set<string> {
  const { litTargetKeys } = simulateLaser(level, placed);
  return litTargetKeys;
}

function countTargets(level: GameLevel): number {
  return level.cells.filter((c) => c.type === 'target').length;
}

function createInitialPlacedBlocks(level: GameLevel): PlacedBlock[] {
  return (level.initialBlocks ?? []).map((block) => ({ ...block, seeded: true }));
}

function computeAvailableCounts(
  level: GameLevel,
  placed: PlacedBlock[],
): Record<BlockType, number> {
  const counts = createEmptyBlockCounts();
  for (const ab of getLevelAvailableBlocks(level)) {
    counts[ab.type] = ab.count;
  }
  for (const pb of placed) {
    counts[pb.type] = Math.max(0, counts[pb.type] - 1);
  }
  return counts;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useGameSession(): UseGameSessionReturn {
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [boardState, setBoardState] = useState<BoardState | null>(null);
  const [levelScores, setLevelScores] = useState<LevelScore[]>([]);
  const [scoreboard, setScoreboard] = useState<GameScoreboard | null>(null);
  const [finalStatus, setFinalStatus] = useState<GameStatusValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<BlockType | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [availableBlockCounts, setAvailableBlockCounts] =
    useState<Record<BlockType, number>>(createEmptyBlockCounts);

  // ── Timer state ──────────────────────────────────────────────────────────────
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerOriginPerfRef = useRef<number | null>(null);
  const timerInitialRemainingMsRef = useRef<number | null>(null);
  const expiryAtRef = useRef<string | null>(null);
  const sessionStartedAtRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const serverStartedAtMsRef = useRef<number | null>(null);
  const clientStartedAtMsRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerIntervalRef.current !== null) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    timerOriginPerfRef.current = null;
    timerInitialRemainingMsRef.current = null;
  }, []);

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

  const startTimer = useCallback(
    (expiryAt: string, startedAt?: string | null) => {
      const expiryTime = new Date(expiryAt).getTime();
      if (Number.isNaN(expiryTime)) {
        expiryAtRef.current = null;
        clearTimer();
        setTimerSeconds(0);
        return;
      }

      const startedTime = startedAt ? new Date(startedAt).getTime() : NaN;
      const sessionDurationMs = Number.isNaN(startedTime)
        ? null
        : Math.max(0, expiryTime - startedTime);
      const wallClockRemainingMs = Math.max(0, expiryTime - Date.now());
      const initialRemainingMs =
        sessionDurationMs === null
          ? wallClockRemainingMs
          : Math.min(wallClockRemainingMs, sessionDurationMs);
      const getRemainingSeconds = () => {
        if (timerOriginPerfRef.current === null || timerInitialRemainingMsRef.current === null) {
          return 0;
        }
        const elapsed = performance.now() - timerOriginPerfRef.current;
        return Math.max(0, Math.ceil((timerInitialRemainingMsRef.current - elapsed) / 1000));
      };

      expiryAtRef.current = expiryAt;
      clearTimer();
      timerOriginPerfRef.current = performance.now();
      timerInitialRemainingMsRef.current = initialRemainingMs;

      const initialRemainingSeconds = getRemainingSeconds();
      setTimerSeconds(initialRemainingSeconds);
      if (initialRemainingSeconds <= 0) {
        clearTimer();
        return;
      }

      timerIntervalRef.current = setInterval(() => {
        const secs = getRemainingSeconds();
        setTimerSeconds(secs);
        if (secs <= 0) clearTimer();
      }, 1000);
    },
    [clearTimer],
  );

  const clearingRef = useRef(false);
  const finalizingRef = useRef(false);
  const transitionSeqRef = useRef(0);

  const moveSubmission = useMoveSubmission(getServerAnchoredTimestamp);
  const levelPrefetch = useLevelPrefetch();

  const syncBoardState = useCallback(
    (level: GameLevel, placed: PlacedBlock[], totalLevels: number) => {
      const litTargetKeys = computeLitTargets(level, placed);
      const allTargetsLit = litTargetKeys.size >= countTargets(level) && countTargets(level) > 0;
      const counts = computeAvailableCounts(level, placed);
      setBoardState({ level, placedBlocks: placed, totalLevels, litTargetKeys, allTargetsLit });
      setAvailableBlockCounts(counts);
    },
    [],
  );

  const revealLevelForPlay = useCallback(async () => {
    const seq = ++transitionSeqRef.current;
    setPhase('level-opening');
    await delay(LEVEL_OPEN_ANIMATION_MS);
    if (transitionSeqRef.current === seq) {
      clearingRef.current = false;
      setPhase('playing');
    }
  }, []);

  // ── Handle game end ───────────────────────────────────────────────────────
  const handleGameEnd = useCallback(
    (status: GameStatusResponse) => {
      transitionSeqRef.current += 1;
      levelPrefetch.reset();
      moveSubmission.stopAutoFlush();
      clearTimer();
      clearSessionClock();
      expiryAtRef.current = null;
      finalizingRef.current = false;
      setTimerSeconds(0);
      setScoreboard(status.scoreboard ?? null);
      setFinalStatus(status.status);
      setSelectedBlock(null);
      setSelectedBlockId(null);
      if (status.scoreboard?.levels) setLevelScores(status.scoreboard.levels);
      setPhase(
        status.status === GameStatus.ENDED ||
        status.status === GameStatus.MANUALLY_ENDED ||
        status.status === GameStatus.EXPIRED
          ? 'completed'
          : 'error',
      );
    },
    [clearSessionClock, clearTimer, levelPrefetch, moveSubmission],
  );

  const handleClearData = useCallback(
    (source: unknown): boolean => {
      if (!isClearData(source)) return false;
      transitionSeqRef.current += 1;
      levelPrefetch.reset();
      moveSubmission.stopAutoFlush();
      moveSubmission.reset();
      clearTimer();
      clearSessionClock();
      expiryAtRef.current = null;
      setTimerSeconds(0);
      storage.clearLiveSession();
      setAuthToken(null);
      clearingRef.current = false;
      finalizingRef.current = false;
      setBoardState(null);
      setSelectedBlock(null);
      setSelectedBlockId(null);
      setError(i18next.t('errors.gameSessionNotFound'));
      setPhase('error');
      return true;
    },
    [clearSessionClock, clearTimer, levelPrefetch, moveSubmission],
  );

  // ── Level solved detection ─────────────────────────────────────────────────
  const onLevelSolved = useCallback(async () => {
    if (clearingRef.current || finalizingRef.current || !boardState) return;
    clearingRef.current = true;
    setSelectedBlock(null);
    setSelectedBlockId(null);
    setPhase('level-clearing');

    await delay(LEVEL_CLEAR_HOLD_MS);

    const currentLvl = boardState.level.levelNumber;
    const isLast = currentLvl >= boardState.totalLevels;

    if (isLast) {
      setPhase('loading-next');
      void (async () => {
        try {
          const resultPromise = moveSubmission.queueEndBoard();
          await delay(LEVEL_CLOSE_ANIMATION_MS);
          const result = await resultPromise;
          setLevelScores((prev) => [
            ...prev,
            { levelNumber: currentLvl, score: result.levelScore },
          ]);
          if (result.gameOver) {
            setPhase('calculating_result');
            const status = requireGameApiData(await getGameStatus(), 'Failed to fetch game status');
            handleGameEnd(status);
            storage.clearLiveSession();
          }
        } catch (err) {
          if (handleClearData(err)) return;
          setError(getErrMsg(err, i18next.t('errors.failedEndLevel')));
          setPhase('error');
        }
      })();
    } else {
      setPhase('loading-next');
      try {
        levelPrefetch.tryPrefetch(currentLvl, boardState.totalLevels);
        const nextLevelPromise = levelPrefetch.awaitLevel();
        const resultPromise = moveSubmission.queueEndBoard();
        await delay(LEVEL_CLOSE_ANIMATION_MS);
        const result = await resultPromise;
        setLevelScores((prev) => [...prev, { levelNumber: currentLvl, score: result.levelScore }]);

        if (result.gameOver) {
          const status = requireGameApiData(await getGameStatus(), 'Failed to fetch game status');
          handleGameEnd(status);
          storage.clearLiveSession();
          return;
        }

        const prefetched = await nextLevelPromise;
        const next =
          prefetched ?? requireGameApiData(await getNextLevel(), 'Failed to load next level');
        const initialPlacedBlocks = createInitialPlacedBlocks(next.currentLevel);
        const nextTotalLevels = next.totalLevels || boardState.totalLevels;
        const nextStartedAt = next.startedAt ?? sessionStartedAtRef.current;
        if (
          next.startedAt &&
          parseTimestampMs(next.startedAt) !== parseTimestampMs(sessionStartedAtRef.current)
        ) {
          anchorSessionClock(next.startedAt);
        }
        sessionStartedAtRef.current = nextStartedAt;
        const nextExpiryAt =
          next.expiryAt ||
          expiryAtRef.current ||
          new Date(Date.now() + Math.max(timerSeconds, 0) * 1000).toISOString();
        syncBoardState(next.currentLevel, initialPlacedBlocks, nextTotalLevels);
        levelPrefetch.reset();
        levelPrefetch.tryPrefetch(next.currentLevel.levelNumber, nextTotalLevels);
        moveSubmission.startAutoFlush(next.currentLevel.levelNumber);
        setSelectedBlock(null);

        const token = getAuthToken() ?? '';
        void storage.saveLiveSession({
          token,
          sessionId: sessionIdRef.current,
          expiryAt: nextExpiryAt,
          startedAt: nextStartedAt,
          clientStartedAtMs: clientStartedAtMsRef.current,
          capturedAtMs: Date.now(),
          totalLevels: nextTotalLevels,
          currentLevelNumber: next.currentLevel.levelNumber,
          level: next.currentLevel,
          placedBlocks: initialPlacedBlocks,
          phase: 'playing',
          pendingMovesByLevel: moveSubmission.getPendingByLevel(),
        });

        startTimer(nextExpiryAt, nextStartedAt);
        await revealLevelForPlay();
      } catch (err) {
        if (handleClearData(err)) return;
        setError(getErrMsg(err, i18next.t('errors.failedLoadNextLevel')));
        setPhase('error');
        clearingRef.current = false;
      }
    }
  }, [
    anchorSessionClock,
    boardState,
    handleClearData,
    handleGameEnd,
    levelPrefetch,
    moveSubmission,
    revealLevelForPlay,
    startTimer,
    syncBoardState,
    timerSeconds,
  ]);

  // Auto-detect solve
  useEffect(() => {
    if (phase === 'playing' && boardState?.allTargetsLit) {
      const solveTimer = setTimeout(() => {
        void onLevelSolved();
      }, 0);
      return () => clearTimeout(solveTimer);
    }
  }, [boardState?.allTargetsLit, onLevelSolved, phase]);

  const finalizeExpiredSession = useCallback(async () => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;

    transitionSeqRef.current += 1;
    levelPrefetch.reset();
    moveSubmission.stopAutoFlush();
    clearTimer();
    setTimerSeconds(0);
    setSelectedBlock(null);
    setSelectedBlockId(null);
    setPhase('calculating_result');

    let sessionFinalized = false;
    try {
      await moveSubmission.flushAll();
      try {
        ensureGameApiSuccess(await endGame());
      } catch (err) {
        if (!isClearData(err)) throw err;
      }
      const status = requireGameApiData(await getGameStatus(), 'Failed to fetch status');
      handleGameEnd(status);
      sessionFinalized = true;
    } catch (err) {
      if (handleClearData(err)) {
        sessionFinalized = true;
        return;
      }
      setError(getErrMsg(err, i18next.t('errors.failedFinalizeExpiredSession')));
      setPhase('error');
    } finally {
      finalizingRef.current = false;
      if (sessionFinalized) {
        storage.clearLiveSession();
      }
    }
  }, [clearTimer, handleClearData, handleGameEnd, levelPrefetch, moveSubmission]);

  // When the timer reaches 0 while playing, finalize immediately if online;
  // otherwise wait for the browser to reconnect and finalize then.
  useEffect(() => {
    if (timerSeconds > 0 || phase !== 'playing' || !expiryAtRef.current) return;

    if (navigator.onLine) {
      void finalizeExpiredSession();
      return;
    }

    // Offline — defer until reconnected
    const handleOnline = () => void finalizeExpiredSession();
    window.addEventListener('online', handleOnline, { once: true });
    return () => window.removeEventListener('online', handleOnline);
  }, [finalizeExpiredSession, phase, timerSeconds]);

  // ── Start game ─────────────────────────────────────────────────────────────
  const startGame = useCallback(async () => {
    setPhase('loading');
    setError(null);
    setLevelScores([]);
    setScoreboard(null);
    setFinalStatus(null);
    clearingRef.current = false;
    finalizingRef.current = false;
    levelPrefetch.reset();
    clearTimer();
    clearSessionClock();
    expiryAtRef.current = null;
    setTimerSeconds(0);
    moveSubmission.reset();
    setSelectedBlock(null);
    setSelectedBlockId(null);

    // Session recovery
    const persisted = await storage.readLiveSession();
    if (persisted) {
      if (persisted.token) setAuthToken(persisted.token);
      sessionIdRef.current = persisted.sessionId;
      sessionStartedAtRef.current = persisted.startedAt;
      anchorSessionClock(persisted.startedAt, persisted.clientStartedAtMs);

      const expMs = Date.parse(persisted.expiryAt);
      const expired = Number.isNaN(expMs) || expMs <= Date.now();

      if (!expired) {
        try {
          const status = requireGameApiData(await getGameStatus(), 'Failed to recover status');
          if (TERMINAL.has(status.status)) {
            handleGameEnd(status);
            storage.clearLiveSession();
            return;
          }
          const recoveredStartedAt = status.startedAt ?? persisted.startedAt;
          const recoveredExpiryAt = status.expiryAt ?? persisted.expiryAt;
          sessionIdRef.current = status.sessionId ?? persisted.sessionId;
          sessionStartedAtRef.current = recoveredStartedAt;
          anchorSessionClock(
            recoveredStartedAt,
            parseTimestampMs(recoveredStartedAt) === parseTimestampMs(persisted.startedAt)
              ? persisted.clientStartedAtMs
              : undefined,
          );
          // Seed completed-level scores so progress dots render correctly on resume.
          const recoveredScores = status.scoreboard?.levels;
          if (recoveredScores && recoveredScores.length > 0) {
            setLevelScores(recoveredScores);
          } else {
            const completedCount = persisted.level.levelNumber - 1;
            if (completedCount > 0) {
              setLevelScores(
                Array.from({ length: completedCount }, (_, i) => ({
                  levelNumber: i + 1,
                  score: null,
                })),
              );
            }
          }
          moveSubmission.hydrateFromSession(persisted.pendingMovesByLevel);
          moveSubmission.startAutoFlush(persisted.level.levelNumber);
          syncBoardState(persisted.level, persisted.placedBlocks, persisted.totalLevels);
          levelPrefetch.tryPrefetch(persisted.level.levelNumber, persisted.totalLevels);
          void storage.saveLiveSession({
            ...persisted,
            sessionId: sessionIdRef.current,
            startedAt: recoveredStartedAt,
            expiryAt: recoveredExpiryAt,
          });
          startTimer(recoveredExpiryAt, recoveredStartedAt);
          await revealLevelForPlay();
          return;
        } catch (err) {
          if (handleClearData(err)) return;
          // API unreachable — derive completed levels from persisted level number.
          const completedCount = persisted.level.levelNumber - 1;
          if (completedCount > 0) {
            setLevelScores(
              Array.from({ length: completedCount }, (_, i) => ({
                levelNumber: i + 1,
                score: null,
              })),
            );
          }
          moveSubmission.hydrateFromSession(persisted.pendingMovesByLevel);
          moveSubmission.startAutoFlush(persisted.level.levelNumber);
          syncBoardState(persisted.level, persisted.placedBlocks, persisted.totalLevels);
          levelPrefetch.tryPrefetch(persisted.level.levelNumber, persisted.totalLevels);
          startTimer(persisted.expiryAt, persisted.startedAt);
          await revealLevelForPlay();
          return;
        }
      }

      // Expired session — seed dots before finalization kicks in.
      const completedCount = persisted.level.levelNumber - 1;
      if (completedCount > 0) {
        setLevelScores(
          Array.from({ length: completedCount }, (_, i) => ({
            levelNumber: i + 1,
            score: null,
          })),
        );
      }
      moveSubmission.hydrateFromSession(persisted.pendingMovesByLevel);
      syncBoardState(persisted.level, persisted.placedBlocks, persisted.totalLevels);
      void finalizeExpiredSession();
      return;
    }

    // Fresh start
    try {
      const session = requireGameApiData(await gameStart(), 'Failed to start game');
      if (TERMINAL.has(session.status)) {
        const status = requireGameApiData(await getGameStatus(), 'Failed to fetch status');
        handleGameEnd(status);
        return;
      }

      const initialPlacedBlocks = createInitialPlacedBlocks(session.currentLevel);
      sessionIdRef.current = session.sessionId;
      sessionStartedAtRef.current = session.startedAt;
      anchorSessionClock(session.startedAt);
      syncBoardState(session.currentLevel, initialPlacedBlocks, session.totalLevels);
      levelPrefetch.tryPrefetch(session.currentLevel.levelNumber, session.totalLevels);
      moveSubmission.startAutoFlush(session.currentLevel.levelNumber);

      void storage.saveLiveSession({
        token: getAuthToken() ?? '',
        sessionId: session.sessionId,
        expiryAt: session.expiryAt,
        startedAt: session.startedAt,
        clientStartedAtMs: clientStartedAtMsRef.current,
        capturedAtMs: Date.now(),
        totalLevels: session.totalLevels,
        currentLevelNumber: session.currentLevel.levelNumber,
        level: session.currentLevel,
        placedBlocks: initialPlacedBlocks,
        phase: 'playing',
        pendingMovesByLevel: {},
      });

      startTimer(session.expiryAt, session.startedAt);
      await revealLevelForPlay();
    } catch (err) {
      if (handleClearData(err)) return;
      setError(getErrMsg(err, i18next.t('errors.failedStartGame')));
      setPhase('error');
    }
  }, [
    anchorSessionClock,
    clearSessionClock,
    clearTimer,
    handleClearData,
    handleGameEnd,
    finalizeExpiredSession,
    levelPrefetch,
    moveSubmission,
    revealLevelForPlay,
    startTimer,
    syncBoardState,
  ]);

  // ── User actions ──────────────────────────────────────────────────────────

  const selectBlock = useCallback((type: BlockType | null) => {
    setSelectedBlock(type);
    setSelectedBlockId(null);
  }, []);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (phase !== 'playing' || !boardState || !selectedBlock) return;

      const fixedCell = boardState.level.cells.find((c) => c.row === row && c.col === col);
      if (fixedCell) return;

      const alreadyPlaced = boardState.placedBlocks.find((b) => b.row === row && b.col === col);
      if (alreadyPlaced) return;

      if (availableBlockCounts[selectedBlock] <= 0) return;

      const placedBlock: PlacedBlock = {
        row,
        col,
        type: selectedBlock,
        ...(selectedBlockId ? { id: selectedBlockId, seeded: true } : {}),
      };
      const newPlaced: PlacedBlock[] = [...boardState.placedBlocks, placedBlock];
      syncBoardState(boardState.level, newPlaced, boardState.totalLevels);
      moveSubmission.pushMove(
        row,
        col,
        selectedBlock,
        boardState.level.levelNumber,
        selectedBlockId ?? undefined,
      );
      void storage.updateSessionPlacedBlocks(newPlaced);
      if (selectedBlockId) {
        setSelectedBlock(null);
        setSelectedBlockId(null);
      }
    },
    [
      availableBlockCounts,
      boardState,
      moveSubmission,
      phase,
      selectedBlock,
      selectedBlockId,
      syncBoardState,
    ],
  );

  const handleCellRemove = useCallback(
    (row: number, col: number) => {
      if (phase !== 'playing' || !boardState) return;

      const idx = boardState.placedBlocks.findIndex((b) => b.row === row && b.col === col);
      if (idx === -1) return;

      const removed = boardState.placedBlocks[idx]!;
      const newPlaced = boardState.placedBlocks.filter((_, i) => i !== idx);
      syncBoardState(boardState.level, newPlaced, boardState.totalLevels);
      if (!removed.seeded) {
        moveSubmission.pushMove(row, col, null, boardState.level.levelNumber, removed.id);
      }
      void storage.updateSessionPlacedBlocks(newPlaced);
      setSelectedBlock(removed.type);
      setSelectedBlockId(removed.id ?? null);
    },
    [boardState, moveSubmission, phase, syncBoardState],
  );

  const handleDrop = useCallback(
    (toRow: number, toCol: number, blockType: BlockType, fromRow: number, fromCol: number) => {
      if (phase !== 'playing' || !boardState) return;

      const fixedCell = boardState.level.cells.find((c) => c.row === toRow && c.col === toCol);
      if (fixedCell) return;

      if (fromRow >= 0 && fromCol >= 0) {
        if (fromRow === toRow && fromCol === toCol) return;
        const source = boardState.placedBlocks.find((b) => b.row === fromRow && b.col === fromCol);
        if (!source) return;
        const alreadyAtTarget = boardState.placedBlocks.find(
          (b) => b.row === toRow && b.col === toCol,
        );
        if (alreadyAtTarget) return;

        const newPlaced: PlacedBlock[] = [
          ...boardState.placedBlocks.filter((b) => !(b.row === fromRow && b.col === fromCol)),
          { ...source, row: toRow, col: toCol, type: blockType },
        ];
        syncBoardState(boardState.level, newPlaced, boardState.totalLevels);
        if (!source.seeded) {
          moveSubmission.pushMove(fromRow, fromCol, null, boardState.level.levelNumber, source.id);
        }
        moveSubmission.pushMove(toRow, toCol, blockType, boardState.level.levelNumber, source.id);
        void storage.updateSessionPlacedBlocks(newPlaced);
        setSelectedBlockId(null);
      } else {
        const alreadyPlaced = boardState.placedBlocks.find(
          (b) => b.row === toRow && b.col === toCol,
        );
        if (alreadyPlaced) return;
        if (availableBlockCounts[blockType] <= 0) return;

        const newPlaced: PlacedBlock[] = [
          ...boardState.placedBlocks,
          { row: toRow, col: toCol, type: blockType },
        ];
        syncBoardState(boardState.level, newPlaced, boardState.totalLevels);
        moveSubmission.pushMove(toRow, toCol, blockType, boardState.level.levelNumber);
        void storage.updateSessionPlacedBlocks(newPlaced);
        setSelectedBlockId(null);
      }
    },
    [availableBlockCounts, boardState, moveSubmission, phase, syncBoardState],
  );

  const forfeit = useCallback(async () => {
    moveSubmission.stopAutoFlush();
    clearTimer();
    setTimerSeconds(0);
    try {
      await moveSubmission.flushAll();
      ensureGameApiSuccess(await endGame());
      const status = requireGameApiData(await getGameStatus(), 'Failed to fetch status');
      handleGameEnd(status);
    } catch (err) {
      if (handleClearData(err)) return;
      setError(getErrMsg(err, i18next.t('errors.failedForfeit')));
    } finally {
      storage.clearLiveSession();
    }
  }, [clearTimer, handleClearData, handleGameEnd, moveSubmission]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      moveSubmission.stopAutoFlush();
      clearTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    phase,
    boardState,
    levelScores,
    scoreboard,
    finalStatus,
    error,
    selectedBlock,
    availableBlockCounts,
    timerSeconds,
    startGame,
    selectBlock,
    handleCellClick,
    handleCellRemove,
    handleDrop,
    forfeit,
  };
}
