import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { getApiErrorMessage } from '@/lib/api/getApiErrorMessage';
import { useApiError } from '@/hooks/useApiError';
import { useMutation } from '@tanstack/react-query';
import { useAudio } from '@/audio';
import { appEnv } from '@/app/config/env';
import {
  completeBoard,
  endGameSession,
  fetchCurrentBoard,
  startGameSession,
} from '@/app/api/gameApi';
import { createDevSession } from '@/app/api/authApi';
import { saveAuthSession } from '@/app/authSession';
import { createFlowGameTransitionHandlers } from '@/features/flow-puzzle/audio/flowGameAudioHandlers';
import { useFlowGame } from '@/features/flow-puzzle/hooks/useFlowGame';
import { useGameInit } from '@/features/flow-puzzle/hooks/useGameInit';
import { useNextBoard } from '@/features/flow-puzzle/hooks/useNextBoard';
import { usePrefetchNextBoard } from '@/features/flow-puzzle/hooks/usePrefetchNextBoard';
import { DEMO_TO_ACTUAL_TRANSITION_PRE_API_MS } from '@/features/flow-puzzle/constants/demoRoundMessages';
import { mapSessionBoardToFlowLevel } from '@/features/flow-puzzle/utils/backendLevelMapper';
import {
  clearActiveSessionId,
  getActiveSessionId,
  setActiveSessionId,
} from '@/features/flow-puzzle/sessionStorage/activeSessionStorage';
import { useSessionTimeSync } from '@/features/flow-puzzle/hooks/useSessionTimeSync';
import { useStageContent } from '@/features/flow-puzzle/hooks/useStageContent';
import { TIME_SYNC_POLL_INTERVAL_MS } from '@/features/flow-puzzle/constants/timeSyncConfig';
import { buildPathMovePayloads } from '@/features/flow-puzzle/save-progress/buildSaveProgressPayload';
import { clearOutbox, loadOutbox } from '@/features/flow-puzzle/save-progress/saveProgressOutbox';
import { useSaveGameProgress } from '@/features/flow-puzzle/save-progress/useSaveGameProgress';
import { FLIP_HALF_S, type FlipPhase } from '@/features/flow-puzzle/components/BoardCardFlip';

const FLIP_WAIT_MS = Math.round(FLIP_HALF_S * 1000) + 80;
const LEVEL_COMPLETE_BURST_MS = 1450;
import { InstructionsLobbyScreen } from '@/features/flow-puzzle/components/InstructionsLobbyScreen';
import { PlayingStageView } from '@/features/flow-puzzle/components/PlayingStageView';
import { DemoPlayView } from '@/features/flow-puzzle/components/DemoPlayView';
import { GameResultOverlay } from '@/features/flow-puzzle/components/GameResultOverlay';
import { markDailyComplete } from '@/features/flow-puzzle/components/DailyChallenge';
import { useDemoLevels } from '@/hooks/useDemoLevels';
import { AuthGateScreen } from '@/components/shared/AuthGateScreen';
import { GameClearModal } from '@/components/shared/GameClearModal';
import { Loader } from '@/components/ui/Loader';
import { buildGameThemeStyle } from '@/utils/gameThemeStyle';
import { getStageTheme } from '@/constants/stageTheme';
import { resolveUserStageNumber } from '@/utils/resolveUserStageNumber';
import type { FlowPathMap } from '@/features/flow-puzzle/types';
import type { StageId } from '@micro-screens/src';

interface FlowPuzzleGameShellProps {
  onExit?: () => void;
  isDaily?: boolean;
}

type StageState = 'start' | 'demo' | 'playing' | 'end';

/**
 * Top-level shell that wires session lifecycle, autosave, prefetch, and win advancement
 * for the Block Fill game.
 *
 * @param props Component props
 */
export function FlowPuzzleGameShell({ onExit: _onExit, isDaily }: FlowPuzzleGameShellProps) {
  const { t } = useTranslation();
  const { showApiError, clearApiError } = useApiError();
  const { gameConfig } = useGameInit();
  const audio = useAudio();
  const sessionTransitionHandlers = useMemo(
    () => createFlowGameTransitionHandlers((key) => void audio.play(key)),
    [audio],
  );
  const game = useFlowGame(sessionTransitionHandlers);
  const [stageState, setStageState] = useState<StageState>('start');
  const [stageKey, setStageKey] = useState(0);
  const [sessionTimerSeconds, setSessionTimerSeconds] = useState(0);
  const [isStartingStage, setIsStartingStage] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [isLoadingFinalScore, setIsLoadingFinalScore] = useState(false);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [apiTotalRounds, setApiTotalRounds] = useState<number | null>(null);
  const [isGameSuccess, setIsGameSuccess] = useState(false);
  const handledWinLevelIdRef = useRef<string | null>(null);
  const restoreAttemptedRef = useRef(false);
  const [waitingForRestore, setWaitingForRestore] = useState(() => !!getActiveSessionId());
  const restoredInPlayingStateRef = useRef(false);
  /** Set when restoring a session whose board was already solved (outbox cleared on restore). */
  const [solvedRestoreBoardId, setSolvedRestoreBoardId] = useState<string | null>(null);
  const [demoToActualPending, setDemoToActualPending] = useState(false);
  const [showDemoCompleteModal, setShowDemoCompleteModal] = useState(false);
  const [boardAdvancePending, setBoardAdvancePending] = useState(false);
  const [boardAdvanceVariant, setBoardAdvanceVariant] = useState<
    'next-round' | 'score-calculating' | null
  >(null);
  const [levelCompleteBurst, setLevelCompleteBurst] = useState(false);
  const [flipPhase, setFlipPhase] = useState<FlipPhase>('idle');
  const levelCompleteBurstTimerRef = useRef<number | null>(null);
  const sessionTimerExpiredHandledRef = useRef(false);
  const [isAutoRestarting, setIsAutoRestarting] = useState(false);
  // Holds the latest handleSessionTimerExpire so onSync can call it when remaining===0
  // without a TypeScript "used before declared" error (handler is defined later in file).
  const sessionTimerExpireCallbackRef = useRef<(() => void) | null>(null);

  const { demoLevels, isLoading: isDemoLoading, isEmpty: isDemoEmpty } = useDemoLevels();

  const startSessionMutation = useMutation({ mutationFn: startGameSession });
  const endSessionMutation = useMutation({ mutationFn: endGameSession });
  const restoreBoardMutation = useMutation({ mutationFn: fetchCurrentBoard });
  const endSession = endSessionMutation.mutateAsync;
  const restoreBoard = restoreBoardMutation.mutateAsync;
  const stageId = appEnv.userStageId;
  const safeStageId = resolveUserStageNumber() as StageId;
  const gameThemeStyle = useMemo(() => buildGameThemeStyle(resolveUserStageNumber()), []);
  const { contentByStage: stageContentByStage, isLoading: isStageContentLoading } = useStageContent(
    { enabled: gameConfig !== null },
  );

  const playLevelCompleteEffect = useCallback(() => {
    if (levelCompleteBurstTimerRef.current !== null) {
      window.clearTimeout(levelCompleteBurstTimerRef.current);
    }

    document.documentElement.classList.remove('block-fill-shell--level-complete');
    void document.documentElement.offsetWidth;
    document.documentElement.classList.add('block-fill-shell--level-complete');
    setLevelCompleteBurst(true);

    levelCompleteBurstTimerRef.current = window.setTimeout(() => {
      document.documentElement.classList.remove('block-fill-shell--level-complete');
      setLevelCompleteBurst(false);
      levelCompleteBurstTimerRef.current = null;
    }, LEVEL_COMPLETE_BURST_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (levelCompleteBurstTimerRef.current !== null) {
        window.clearTimeout(levelCompleteBurstTimerRef.current);
      }
      document.documentElement.classList.remove('block-fill-shell--level-complete');
    };
  }, []);

  const backendSessionId = game.currentLevel?.metadata.sessionId;
  const backendBoardId = game.currentLevel?.metadata.sessionBoardId ?? game.currentLevel?.id ?? '';

  const [syncedVersionInfo, setSyncedVersionInfo] = useState<{
    boardId: string;
    version: number;
  } | null>(null);

  const autosaveEligible =
    stageState === 'playing' &&
    typeof backendSessionId === 'string' &&
    backendSessionId.length > 0 &&
    backendBoardId.length > 0;

  /** True until the restored-solved board advances and `currentLevel` changes. */
  const isSolvedRestoreActive =
    solvedRestoreBoardId !== null && solvedRestoreBoardId === game.currentLevel?.id;

  const resolvedBoardVersion =
    syncedVersionInfo?.boardId === backendBoardId
      ? syncedVersionInfo.version
      : (game.currentLevel?.metadata.version ?? 0);

  const { drainAutosaveBeforeComplete } = useSaveGameProgress({
    enabled: autosaveEligible,
    sessionId: backendSessionId,
    sessionBoardId: backendBoardId,
    boardVersion: resolvedBoardVersion,
    onBoardVersionSynced: (version) => setSyncedVersionInfo({ boardId: backendBoardId, version }),
    level: autosaveEligible && game.currentLevel ? game.currentLevel : null,
    session: autosaveEligible ? game.session : null,
  });

  useSessionTimeSync({
    sessionId: backendSessionId,
    enabled:
      stageState === 'playing' &&
      !!backendSessionId &&
      game.currentLevel?.metadata.isDemoRound === false,
    pollIntervalMs: TIME_SYNC_POLL_INTERVAL_MS,
    onSync: (remaining) => {
      setSessionTimerSeconds(remaining);
      if (remaining === 0) {
        sessionTimerExpireCallbackRef.current?.();
      }
    },
  });

  const requestNextBoard = useNextBoard(gameConfig);

  const mapBoardPaths = (
    paths: Array<{ color: string; path: Array<{ row: number; col: number }> }> | undefined,
  ): FlowPathMap =>
    (paths ?? []).reduce<FlowPathMap>((acc, entry) => {
      acc[entry.color] = entry.path ?? [];
      return acc;
    }, {});

  const mergeServerAndPendingPaths = (
    sessionId: string,
    sessionBoardId: string,
    serverPaths: FlowPathMap,
  ): FlowPathMap => {
    const pending = loadOutbox(sessionId).filter(
      (entry) => entry.sessionBoardId === sessionBoardId,
    );
    if (pending.length === 0) {
      return serverPaths;
    }

    const latestPendingByColor = pending.reduce<
      Record<string, { path: Array<{ row: number; col: number }>; createdAt: number }>
    >((acc, entry) => {
      const existing = acc[entry.color];
      if (!existing || entry.createdAt >= existing.createdAt) {
        acc[entry.color] = {
          path: entry.pathPayload.path ?? [],
          createdAt: entry.createdAt,
        };
      }
      return acc;
    }, {});

    const merged: FlowPathMap = { ...serverPaths };
    Object.entries(latestPendingByColor).forEach(([color, value]) => {
      merged[color] = value.path;
    });
    return merged;
  };

  const { prefetchedNextLevel, setPrefetchedNextLevel, prefetchedForLevelIdRef } =
    usePrefetchNextBoard({
      stageState,
      currentLevel: game.currentLevel,
      stats: game.stats,
      winSummary: game.winSummary,
      gameConfig,
      requestNextBoard,
    });

  const startStage = async () => {
    if (!stageId) {
      showApiError({
        title: t('errors.startFailed'),
        description: 'Missing stage id in environment',
      });
      return;
    }
    setIsStartingStage(true);
    clearApiError();
    setFinalScore(null);
    setIsLoadingFinalScore(false);
    setDemoToActualPending(false);
    setBoardAdvancePending(false);
    setBoardAdvanceVariant(null);
    sessionTimerExpiredHandledRef.current = false;
    try {
      let sessionData = await startSessionMutation.mutateAsync(stageId);

      if (sessionData.status === 'COMPLETED' || !sessionData.board) {
        setIsAutoRestarting(true);
        clearActiveSessionId();
        try {
          window.localStorage.clear();
        } catch {
          /* storage unavailable */
        }
        const freshSession = await createDevSession(stageId);
        saveAuthSession(freshSession);
        sessionData = await startSessionMutation.mutateAsync(stageId);
      }

      if (!sessionData.board) {
        throw new Error('Failed to load board after starting game session');
      }

      const level = mapSessionBoardToFlowLevel(
        sessionData.board,
        sessionData.stageId,
        sessionData.sessionId,
        sessionData.currentRoundNumber,
        sessionData.totalActualRounds ?? sessionData.totalRounds ?? 0,
        sessionData.isDemoRound,
        sessionData.currentDemoRound,
        sessionData.currentActualRound,
        sessionData.totalActualRounds,
        sessionData.requestedDemoRound,
        sessionData.requestedActualRound,
      );
      game.openPlaylist([level]);
      setActiveSessionId(sessionData.sessionId);
      setStageKey((k) => k + 1);
      if (sessionData.endTime) {
        const remaining = Math.max(
          0,
          Math.round((new Date(sessionData.endTime).getTime() - Date.now()) / 1000),
        );
        setSessionTimerSeconds(remaining);
      }
      setStageState('playing');
    } catch (error) {
      showApiError({
        title: t('errors.startFailed'),
        description: getApiErrorMessage(error, 'Failed to start game session'),
      });
    } finally {
      setIsStartingStage(false);
      setIsAutoRestarting(false);
    }
  };

  const startDemo = () => {
    if (!demoLevels || demoLevels.length === 0) return;
    game.openPlaylist(demoLevels);
    setStageState('demo');
  };

  const handleDemoExit = () => {
    game.goHome();
    setStageState('start');
  };

  const playlistCount = useMemo(() => game.playlistLevels?.length ?? 1, [game.playlistLevels]);
  const totalRounds = apiTotalRounds ?? gameConfig?.totalRounds ?? playlistCount;

  useEffect(() => {
    if (
      stageState !== 'start' ||
      isStartingStage ||
      game.currentLevel ||
      !gameConfig ||
      restoreBoardMutation.isPending ||
      restoreAttemptedRef.current
    ) {
      return;
    }
    restoreAttemptedRef.current = true;
    const activeSessionId = getActiveSessionId();
    if (!activeSessionId) {
      return;
    }

    void restoreBoard(activeSessionId)
      .then((sessionData) => {
        const totalActualRounds = sessionData.totalActualRounds ?? gameConfig.totalRounds ?? 0;
        const roundNumber =
          (sessionData.isDemoRound
            ? sessionData.currentDemoRound
            : sessionData.currentActualRound) || 1;
        const level = mapSessionBoardToFlowLevel(
          sessionData.board,
          sessionData.stageId,
          sessionData.sessionId,
          roundNumber,
          totalActualRounds,
          sessionData.isDemoRound,
          sessionData.currentDemoRound,
          sessionData.currentActualRound,
          sessionData.totalActualRounds,
          sessionData.requestedDemoRound,
          sessionData.requestedActualRound,
        );
        const serverPaths = mapBoardPaths(sessionData.board.paths);
        const mergedPaths = mergeServerAndPendingPaths(
          sessionData.sessionId,
          sessionData.board.sessionBoardId,
          serverPaths,
        );
        game.restorePlaylist([level], mergedPaths, (isSolved) => {
          if (isSolved) {
            // Board is already fully solved — clear the outbox so replay() is skipped
            // and only completeBoard is called (via triggerWin → advance).
            clearOutbox(sessionData.sessionId);
            setSolvedRestoreBoardId(level.id);
          }
        });
        restoredInPlayingStateRef.current = true;
        sessionTimerExpiredHandledRef.current = false;
        setStageState('playing');
        if (sessionData.endTime) {
          const remaining = Math.max(
            0,
            Math.round((new Date(sessionData.endTime).getTime() - Date.now()) / 1000),
          );
          setSessionTimerSeconds(remaining);
        }
      })
      .catch((error) => {
        clearActiveSessionId();
        const msg = error instanceof Error ? error.message : '';
        if (msg === 'GAME_SESSION_TIMEOUT') {
          clearOutbox(activeSessionId);
          setFinalScore(null);
          setIsLoadingFinalScore(true);
          setIsGameSuccess(false);
          setCompletedRounds(0);
          setStageState('end');
          void endSession({ sessionId: activeSessionId })
            .then((data) => { setFinalScore(data.finalScore); setCompletedRounds(data.roundsCompleted); setApiTotalRounds(data.totalRounds); })
            .catch((err) =>
              showApiError({
                title: t('errors.scoreFailed'),
                description: getApiErrorMessage(err, 'Failed to load final score'),
              }),
            )
            .finally(() => setIsLoadingFinalScore(false));
        } else {
          setWaitingForRestore(false);
          showApiError({
            title: t('errors.connectionFailed'),
            description: msg || 'Failed to restore game session',
          });
        }
      });
  }, [
    endSession,
    game,
    gameConfig,
    isStartingStage,
    restoreBoard,
    restoreBoardMutation.isPending,
    showApiError,
    stageState,
    t,
    game.currentLevel,
  ]);

  useEffect(() => {
    if (stageState !== 'playing' || !game.winSummary) return;
    const levelId = game.currentLevel?.id;
    if (!levelId || handledWinLevelIdRef.current === levelId) return;
    handledWinLevelIdRef.current = levelId;
    void isSolvedRestoreActive;
    playLevelCompleteEffect();

    const level = game.currentLevel!;
    const session = game.session;
    const sid = level.metadata.sessionId;
    const boardId = level.metadata.sessionBoardId ?? level.id;

    const advance = async () => {
      const totalDemoRoundsEarly = gameConfig?.totalDemoRounds ?? 0;
      const isLastDemoRound =
        level.metadata.isDemoRound === true &&
        totalDemoRoundsEarly > 0 &&
        (level.metadata.requestedDemoRound ?? 0) >= totalDemoRoundsEarly;
      const totalActualRoundsEarly = level.metadata.totalActualRounds ?? 0;
      const isLastActualRound =
        !level.metadata.isDemoRound &&
        totalActualRoundsEarly > 0 &&
        (level.metadata.requestedActualRound ?? 0) >= totalActualRoundsEarly;

      if (isLastDemoRound) {
        setDemoToActualPending(true);
      } else if (isLastActualRound) {
        setBoardAdvancePending(true);
        setBoardAdvanceVariant('score-calculating');
      } else {
        setFlipPhase('folding');
      }

      const foldPromise =
        !isLastDemoRound && !isLastActualRound
          ? new Promise<void>((r) => { window.setTimeout(r, FLIP_WAIT_MS); })
          : null;

      try {
        if (sid && boardId && session) {
          const finalPaths = buildPathMovePayloads({ level, paths: session.paths }).map(
            ({ moveId, timeStamp, color, path }) => ({ moveId, timeStamp, color, path }),
          );
          try {
            const versionForComplete = await drainAutosaveBeforeComplete();
            await completeBoard({
              sessionId: sid,
              board: { sessionBoardId: boardId, version: versionForComplete, paths: finalPaths },
            });
          } catch {
            handledWinLevelIdRef.current = null;
            setIsGameSuccess(false);
            setCompletedRounds(Math.max(0, (level.metadata.requestedActualRound ?? 1) - 1));
            setStageState('end');
            game.leaveGame();
            return;
          }
        }

        if (isLastDemoRound) {
          try {
            await new Promise<void>((resolve) => {
              window.setTimeout(resolve, DEMO_TO_ACTUAL_TRANSITION_PRE_API_MS);
            });
            const { level: nextLevel, endTime } = await requestNextBoard(level);
            if (endTime) {
              const remaining = Math.max(
                0,
                Math.round((new Date(endTime).getTime() - Date.now()) / 1000),
              );
              setSessionTimerSeconds(remaining);
              setStageKey((k) => k + 1);
            }
            game.openPlaylist([nextLevel]);
            if (nextLevel.metadata.sessionId) {
              setActiveSessionId(nextLevel.metadata.sessionId);
            }
            setPrefetchedNextLevel(null);
            prefetchedForLevelIdRef.current = null;
          } catch {
            handledWinLevelIdRef.current = null;
            setIsGameSuccess(false);
            setCompletedRounds(0);
            setStageState('end');
            game.leaveGame();
            clearActiveSessionId();
          }
          return;
        }

        if (isLastActualRound) {
          setFinalScore(null);
          setIsLoadingFinalScore(true);
          setIsGameSuccess(true);
          if (isDaily) markDailyComplete();
          setCompletedRounds(totalActualRoundsEarly);
          setStageState('end');
          if (sid) {
            try {
              const endData = await endSession({ sessionId: sid });
              setFinalScore(endData.finalScore);
              setCompletedRounds(endData.roundsCompleted);
              setApiTotalRounds(endData.totalRounds);
            } catch (error) {
              showApiError({
                title: t('errors.scoreFailed'),
                description: getApiErrorMessage(error, 'Failed to load final score'),
              });
            } finally {
              setIsLoadingFinalScore(false);
            }
          } else {
            showApiError({
              title: t('errors.scoreFailed'),
              description: 'Missing session id for final score',
            });
            setIsLoadingFinalScore(false);
          }
          game.leaveGame();
          clearActiveSessionId();
          return;
        }

        if (prefetchedNextLevel) {
          const lvl = prefetchedNextLevel;
          setPrefetchedNextLevel(null);
          prefetchedForLevelIdRef.current = null;
          await foldPromise;
          game.openPlaylist([lvl]);
          setFlipPhase('unfolding');
          await new Promise<void>((r) => { globalThis.setTimeout(r, FLIP_WAIT_MS); });
          setFlipPhase('idle');
          return;
        }

        try {
          const { level: nextLevel } = await requestNextBoard(level);
          if (nextLevel.metadata.sessionId) {
            setActiveSessionId(nextLevel.metadata.sessionId);
          }
          setPrefetchedNextLevel(null);
          prefetchedForLevelIdRef.current = null;
          await foldPromise;
          game.openPlaylist([nextLevel]);
          setFlipPhase('unfolding');
          await new Promise<void>((r) => { globalThis.setTimeout(r, FLIP_WAIT_MS); });
          setFlipPhase('idle');
        } catch {
          handledWinLevelIdRef.current = null;
          setIsGameSuccess(false);
          setCompletedRounds(Math.max(0, (level.metadata.requestedActualRound ?? 1) - 1));
          setStageState('end');
          game.leaveGame();
          clearActiveSessionId();
        }
      } finally {
        setBoardAdvancePending(false);
        setBoardAdvanceVariant(null);
        setDemoToActualPending(false);
        setFlipPhase('idle');
      }
    };

    void advance();
  }, [
    game,
    gameConfig,
    prefetchedNextLevel,
    requestNextBoard,
    stageState,
    isSolvedRestoreActive,
    drainAutosaveBeforeComplete,
    setPrefetchedNextLevel,
    prefetchedForLevelIdRef,
    endSession,
    showApiError,
    t,
    playLevelCompleteEffect,
  ]);

  useEffect(() => {
    if (!game.currentLevel || !game.winSummary) {
      handledWinLevelIdRef.current = null;
    }
  }, [game.currentLevel, game.winSummary]);

  useEffect(() => {
    if (stageState !== 'demo' || !game.winSummary) return;
    const advanceDemo = async () => {
      playLevelCompleteEffect();

      if (game.hasNextLevel) {
        setFlipPhase('folding');
        await new Promise<void>((r) => { globalThis.setTimeout(r, FLIP_WAIT_MS); });
        game.goToNextLevel();
        setFlipPhase('unfolding');
        await new Promise<void>((r) => { globalThis.setTimeout(r, FLIP_WAIT_MS); });
        setFlipPhase('idle');
      } else {
        setShowDemoCompleteModal(true);
      }
    };
    void advanceDemo();
  }, [stageState, game.winSummary, game, playLevelCompleteEffect]);

  const finishDemo = useCallback(() => {
    game.goHome();
    setStageState('start');
    setShowDemoCompleteModal(false);
  }, [game]);

  // When a board is restored already in a fully-solved state (user solved the
  // puzzle then refreshed before completeBoard was called), synthesize a win so
  // the existing advance effect picks it up and calls completeBoard / next-board.
  useEffect(() => {
    if (
      !restoredInPlayingStateRef.current ||
      stageState !== 'playing' ||
      !game.session?.isSolved ||
      game.winSummary !== null
    ) {
      return;
    }
    restoredInPlayingStateRef.current = false;
    game.triggerWin();
  }, [stageState, game]);

  const handleSessionTimerExpire = useCallback(() => {
    if (sessionTimerExpiredHandledRef.current) return;
    sessionTimerExpiredHandledRef.current = true;

    const sid = game.currentLevel?.metadata.sessionId ?? getActiveSessionId() ?? undefined;

    if (!sid) {
      clearActiveSessionId();
      game.goHome();
      setStageState('start');
      sessionTimerExpiredHandledRef.current = false;
      return;
    }

    setFinalScore(null);
    setIsLoadingFinalScore(true);
    setIsGameSuccess(false);
    setCompletedRounds(Math.max(0, (game.currentLevel?.metadata.requestedActualRound ?? 1) - 1));
    setStageState('end');
    clearOutbox(sid);
    game.leaveGame();
    clearActiveSessionId();

    void endSession({ sessionId: sid })
      .then((data) => { setFinalScore(data.finalScore); setCompletedRounds(data.roundsCompleted); setApiTotalRounds(data.totalRounds); })
      .catch((err) =>
        showApiError({
          title: t('errors.scoreFailed'),
          description: getApiErrorMessage(err, 'Failed to load final score'),
        }),
      )
      .finally(() => setIsLoadingFinalScore(false));
  }, [game, endSession, showApiError, t]);

  // Keep the ref current so onSync can invoke the latest handler when remaining===0
  // (updates in an effect — refs must not be written during render).
  useEffect(() => {
    sessionTimerExpireCallbackRef.current = handleSessionTimerExpire;
    return () => {
      sessionTimerExpireCallbackRef.current = null;
    };
  }, [handleSessionTimerExpire]);

  const showLoader =
    stageState === 'start' &&
    (restoreBoardMutation.isPending || waitingForRestore || isAutoRestarting);

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      {levelCompleteBurst ? (
        <div className="block-fill-level-complete-burst" aria-hidden="true" />
      ) : null}

      <div className="relative z-[2] w-full">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" />

        <div className="relative z-10 flex-col justify-center gap-6">
          {stageState === 'start' && showLoader ? (
            <AuthGateScreen
              gameThemeStyle={gameThemeStyle}
              error={null}
              phase="config"
              loaderOnly
            />
          ) : null}

          {stageState === 'start' && !showLoader ? (
            <InstructionsLobbyScreen
              stage={safeStageId}
              isStarting={isStartingStage}
              enableLearnHowToPlay={(gameConfig?.enableDemo ?? false) && !isDemoEmpty && !isDemoLoading}
              onPlayNow={() => void startStage()}
              onLearnHowToPlay={startDemo}
              contentByStage={stageContentByStage}
              isContentLoading={Boolean(isStageContentLoading)}
            />
          ) : null}

          {stageState === 'demo' && game.currentLevel && game.session ? (
            <DemoPlayView
              level={game.currentLevel}
              session={game.session}
              winSummary={game.winSummary}
              flipPhase={flipPhase}
              onBeginPath={game.handleBeginPath}
              onDragPath={game.handleDragPath}
              onEndPath={game.handleEndPath}
              onSkip={handleDemoExit}
            />
          ) : null}

          {stageState === 'playing' && game.currentLevel && game.session ? (
            <PlayingStageView
              currentLevel={game.currentLevel}
              session={game.session}
              gameConfig={gameConfig}
              stageKey={stageKey}
              sessionTimerSeconds={sessionTimerSeconds}
              demoToActualPending={demoToActualPending}
              boardAdvancePending={boardAdvancePending}
              boardAdvanceVariant={boardAdvanceVariant}
              flipPhase={flipPhase}
              onBeginPath={game.handleBeginPath}
              onDragPath={game.handleDragPath}
              onEndPath={game.handleEndPath}
              onTimerExpire={handleSessionTimerExpire}
            />
          ) : null}
        </div>

        {stageState === 'end' && isLoadingFinalScore ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <Loader />
          </div>
        ) : null}

        <GameResultOverlay
          open={stageState === 'end' && !isLoadingFinalScore}
          isSuccess={isGameSuccess}
          stage={safeStageId}
          score={finalScore ?? 0}
          completedRounds={completedRounds}
          totalRounds={totalRounds}
          onContinue={() => {
            try {
              window.localStorage.clear();
            } catch {
              /* storage may be unavailable in private mode / SSR */
            }
            window.location.reload();
          }}
        />
      </div>

      {showDemoCompleteModal && (
        <GameClearModal
          title={t('game.demoCleared')}
          accentColor={getStageTheme(safeStageId).accent}
          eclipseColor={getStageTheme(safeStageId).eclipse}
          onConfirm={finishDemo}
        />
      )}
    </motion.div>
  );
}
