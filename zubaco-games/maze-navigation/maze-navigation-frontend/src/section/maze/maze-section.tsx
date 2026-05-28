import { LiveGameRouteSkeleton } from "@/components/molecules/live-game-route-skeleton";
import { MazeTemplate } from "@/components/templates/maze-template";
import { GAME_SESSION_STATUS } from "@/constants/game-session-status";
import { MAZE_DEMO_COMPLETE_EXIT_DELAY_MS } from "@/constants/maze";
import { useMazeAudio } from "@/hooks/use-maze-audio";
import { useMazeTimer } from "@/hooks/use-maze-timer";
import { useRequestDevAuthRefresh } from "@/hooks/use-dev-auth";
import { applyMazePhaseAudio } from "@/lib/audio/maze-audio-phase";
import { useDemoStore } from "@/store/demo";
import { useLiveStore } from "@/store/live";
import { useSettingsStore } from "@/store/settings";
import type { GameSessionResponse } from "@/types/api/game";
import { MAZE_AUDIO_EVENT } from "@/types/maze-audio-events";
import { MazeGamePhase } from "@/types/maze-phase";
import type { StageId } from "@/types/stage-theme";
import {
  isMazePlayModeDemo,
  type MazePlayMode,
} from "@/utils/maze/maze-play-mode";
import { normalizeStageId } from "@/utils/stage/stage-utils";
import { secondsRemainingUntil } from "@/utils/time/expiry-timer";
import { paths } from "@app/router/routes";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";

interface MazeSectionProps {
  readonly mode: MazePlayMode;
  readonly stageId: StageId;
}

const LIVE_GAME_BOOTSTRAP_MIN_UI_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function isTerminalGameStatus(status: number): boolean {
  return (
    status === GAME_SESSION_STATUS.ENDED ||
    status === GAME_SESSION_STATUS.EXPIRED ||
    status === GAME_SESSION_STATUS.RESULT_PROCESSING ||
    status === GAME_SESSION_STATUS.MANUALLY_ENDED
  );
}

function resolveRoundsProgress(data: {
  status: number;
  totalRounds: number;
  completedBoards?: number;
}): { total: number; completed: number } {
  const total = Math.max(1, data.totalRounds);
  if (typeof data.completedBoards === "number") {
    return {
      total,
      completed: Math.min(Math.max(0, data.completedBoards), total),
    };
  }
  if (data.status === GAME_SESSION_STATUS.ENDED) {
    return { total, completed: total };
  }
  return { total, completed: 0 };
}

export function MazeSection({ mode, stageId }: Readonly<MazeSectionProps>) {
  const navigate = useNavigate();
  const requestDevAuthRefresh = useRequestDevAuthRefresh();
  const isDemo = isMazePlayModeDemo(mode);

  const demoPhase = useDemoStore((s) => s.phase);
  const livePhase = useLiveStore((s) => s.phase);
  const phase = isDemo ? demoPhase : livePhase;

  const demoTimer = useDemoStore((s) => s.timer);
  const liveTimer = useLiveStore((s) => s.timer);
  const timer = isDemo ? demoTimer : liveTimer;
  const demoLevel = useDemoStore((s) => s.level);
  const demoSession = useDemoStore((s) => s.demoSession);
  const liveLevel = useLiveStore((s) => s.level);
  const level = isDemo ? demoLevel : liveLevel;
  const soundEffectsEnabled = useSettingsStore((s) => s.soundEffectsEnabled);
  const setSoundEffectsEnabled = useSettingsStore(
    (s) => s.setSoundEffectsEnabled,
  );

  const resetGame = useDemoStore((s) => s.resetGame);
  const goToStart = useDemoStore((s) => s.goToStart);
  const {
    fetchStatus,
    clearLiveSession,
    endGameEarly,
    publishTerminalResult,
    setResult,
    startLivePlaying,
    prepareLiveGameRouteEntry,
    hasActiveLiveSession,
  } = useLiveStore(
    useShallow((s) => ({
      fetchStatus: s.fetchStatus,
      clearLiveSession: s.clearLiveSession,
      endGameEarly: s.endGameEarly,
      publishTerminalResult: s.publishTerminalResult,
      setResult: s.setResult,
      startLivePlaying: s.startLivePlaying,
      prepareLiveGameRouteEntry: s.prepareLiveGameRouteEntry,
      hasActiveLiveSession: s.hasActiveLiveSession,
    })),
  );
  const liveSession = useLiveStore((s) => s.session);

  const applyLiveSessionToHud = useCallback(
    (data: GameSessionResponse) => {
      const remaining = secondsRemainingUntil(data.expiryAt);
      startLivePlaying(
        data.maze?.roundNumber ?? 1,
        remaining,
        data.scoreboard.totalScore,
      );
    },
    [startLivePlaying],
  );

  const {
    playBgm,
    stopBgm,
    playLose,
    playMove,
    playPickSide,
    playWin,
  } = useMazeAudio(soundEffectsEnabled);
  const [isWindowFocused, setIsWindowFocused] = useState<boolean>(true);
  const [isStartFreshPending, setIsStartFreshPending] = useState(false);
  const [isDemoExitPending, setIsDemoExitPending] = useState(false);
  const suppressLiveStatusBootstrapRef = useRef(false);
  const liveBootstrapFinishedRef = useRef(false);
  const liveStatusBootstrapInFlightRef = useRef(false);
  const [liveBootstrapUiReady, setLiveBootstrapUiReady] = useState(
    () =>
      isDemo ||
      (hasActiveLiveSession &&
        liveSession?.status === GAME_SESSION_STATUS.STARTED),
  );

  useMazeTimer(mode);

  useLayoutEffect(() => {
    if (isDemo || liveBootstrapUiReady) {
      return;
    }
    prepareLiveGameRouteEntry(stageId);
  }, [isDemo, liveBootstrapUiReady, prepareLiveGameRouteEntry, stageId]);

  useLayoutEffect(() => {
    if (!isDemo || !demoSession?.enableDemo) {
      return;
    }
    if (demoPhase !== MazeGamePhase.START) {
      return;
    }
    resetGame();
  }, [demoPhase, demoSession, isDemo, resetGame]);

  useEffect(() => {
    if (!isDemo) {
      suppressLiveStatusBootstrapRef.current = false;
    }
  }, [isDemo, stageId]);

  useEffect(() => {
    if (isDemo || !liveBootstrapUiReady || phase === MazeGamePhase.PLAYING) {
      return;
    }

    const { session, hasActiveLiveSession } = useLiveStore.getState();
    if (
      hasActiveLiveSession &&
      session?.status === GAME_SESSION_STATUS.STARTED
    ) {
      applyLiveSessionToHud(session);
    }
  }, [applyLiveSessionToHud, isDemo, liveBootstrapUiReady, phase]);

  useEffect(() => {
    if (isDemo) {
      return;
    }

    if (
      suppressLiveStatusBootstrapRef.current ||
      liveBootstrapFinishedRef.current
    ) {
      return;
    }

    let cancelled = false;

    const finishBootstrap = () => {
      liveBootstrapFinishedRef.current = true;
      setLiveBootstrapUiReady(true);
    };

    const bootstrapLive = async () => {
      if (
        suppressLiveStatusBootstrapRef.current ||
        liveBootstrapFinishedRef.current
      ) {
        return;
      }

      const startedAt = Date.now();
      const cached = useLiveStore.getState();
      if (
        cached.hasActiveLiveSession &&
        cached.session?.status === GAME_SESSION_STATUS.STARTED
      ) {
        applyLiveSessionToHud(cached.session);
        finishBootstrap();
        return;
      }

      if (liveStatusBootstrapInFlightRef.current) {
        return;
      }
      liveStatusBootstrapInFlightRef.current = true;

      try {
        const data = await fetchStatus();
        if (!data) {
          finishBootstrap();
          if (!cancelled) {
            clearLiveSession();
            navigate(paths.home, { replace: true });
          }
          return;
        }
        if (isTerminalGameStatus(data.status)) {
          const elapsed = Date.now() - startedAt;
          await delay(Math.max(0, LIVE_GAME_BOOTSTRAP_MIN_UI_MS - elapsed));
          liveBootstrapFinishedRef.current = true;
          if (cancelled) {
            return;
          }
          const stage = normalizeStageId(stageId);
          const { total, completed } = resolveRoundsProgress(data);
          setResult({
            stage,
            score: data.scoreboard.totalScore,
            completed,
            total,
            variant:
              data.status === GAME_SESSION_STATUS.ENDED ? "success" : "failure",
          });
          navigate(paths.results, { replace: true });
          return;
        }
        applyLiveSessionToHud(data);
        finishBootstrap();
      } catch {
        finishBootstrap();
        if (!cancelled) {
          navigate(paths.home, { replace: true });
        }
      } finally {
        liveStatusBootstrapInFlightRef.current = false;
      }
    };

    void bootstrapLive();

    return () => {
      cancelled = true;
      liveStatusBootstrapInFlightRef.current = false;
    };
  }, [
    applyLiveSessionToHud,
    clearLiveSession,
    fetchStatus,
    isDemo,
    navigate,
    setResult,
    stageId,
  ]);

  useEffect(() => {
    if (!isDemo || phase !== MazeGamePhase.WIN) {
      return;
    }
    const timeoutId = globalThis.setTimeout(() => {
      navigate(paths.home, { replace: true });
    }, MAZE_DEMO_COMPLETE_EXIT_DELAY_MS);
    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [isDemo, navigate, phase]);

  useLayoutEffect(() => {
    if (
      isDemo ||
      (phase !== MazeGamePhase.WIN && phase !== MazeGamePhase.LOSE)
    ) {
      return;
    }
    publishTerminalResult(
      stageId,
      phase === MazeGamePhase.WIN ? "success" : "failure",
    );
    navigate(paths.results, { replace: true });
  }, [isDemo, navigate, phase, publishTerminalResult, stageId]);

  useEffect(() => {
    const getFocusState = () =>
      document.visibilityState === "visible" && document.hasFocus();

    const updateFocusState = () => {
      setIsWindowFocused(getFocusState());
    };

    updateFocusState();
    globalThis.window.addEventListener("focus", updateFocusState);
    globalThis.window.addEventListener("blur", updateFocusState);
    document.addEventListener("visibilitychange", updateFocusState);

    return () => {
      globalThis.window.removeEventListener("focus", updateFocusState);
      globalThis.window.removeEventListener("blur", updateFocusState);
      document.removeEventListener("visibilitychange", updateFocusState);
    };
  }, []);

  useEffect(() => {
    if (!soundEffectsEnabled) {
      return;
    }
    if (phase === MazeGamePhase.PLAYING && !isWindowFocused) {
      stopBgm();
      return;
    }

    applyMazePhaseAudio(phase, { playBgm, stopBgm, playWin, playLose });
  }, [
    isWindowFocused,
    phase,
    playBgm,
    playLose,
    playWin,
    soundEffectsEnabled,
    stopBgm,
  ]);

  useEffect(() => {
    const onMove = () => {
      playMove();
    };
    const onPickSide = () => {
      playPickSide();
    };
    const onGoalReached = () => {
      playWin();
    };

    window.addEventListener(MAZE_AUDIO_EVENT.move, onMove);
    window.addEventListener(MAZE_AUDIO_EVENT.pickSide, onPickSide);
    window.addEventListener(MAZE_AUDIO_EVENT.goalReached, onGoalReached);

    return () => {
      window.removeEventListener(MAZE_AUDIO_EVENT.move, onMove);
      window.removeEventListener(MAZE_AUDIO_EVENT.pickSide, onPickSide);
      window.removeEventListener(MAZE_AUDIO_EVENT.goalReached, onGoalReached);
    };
  }, [playMove, playPickSide, playWin]);

  const handleDone = useCallback(() => {
    setIsDemoExitPending(true);
    resetGame(stageId);
    navigate(paths.home, { replace: true });
  }, [navigate, resetGame, stageId]);

  const handleStartFresh = useCallback(async () => {
    if (isStartFreshPending) {
      return;
    }
    setIsStartFreshPending(true);
    if (!isDemo) {
      suppressLiveStatusBootstrapRef.current = true;
    }
    try {
      if (!isDemo && hasActiveLiveSession) {
        await endGameEarly({ refreshStatus: false }).catch(() => null);
      }
      clearLiveSession();
      goToStart(stageId);
      requestDevAuthRefresh();
      navigate(paths.home, { replace: true });
    } catch {
      setIsStartFreshPending(false);
    }
  }, [
    clearLiveSession,
    endGameEarly,
    goToStart,
    hasActiveLiveSession,
    isDemo,
    isStartFreshPending,
    navigate,
    requestDevAuthRefresh,
    stageId,
  ]);

  const skeletonProps = {
    interactiveHud: true as const,
    playMode: mode,
    level,
    timer,
    soundEffectsEnabled,
    onToggleSoundEffects: setSoundEffectsEnabled,
    onStartFresh: handleStartFresh,
    isStartFreshPending,
    onDone: isDemo ? handleDone : undefined,
  };

  const isTerminalPhase =
    phase === MazeGamePhase.WIN || phase === MazeGamePhase.LOSE;
  const isLiveGameReady =
    !isDemo &&
    liveBootstrapUiReady &&
    phase === MazeGamePhase.PLAYING &&
    liveSession?.status === GAME_SESSION_STATUS.STARTED &&
    liveSession.maze !== null &&
    liveSession.maze !== undefined;
  const isDemoGameReady = isDemo && phase === MazeGamePhase.PLAYING;
  const isGameReady = isDemoGameReady || isLiveGameReady;
  const showPlay =
    !isStartFreshPending && !isDemoExitPending && !isTerminalPhase && isGameReady;
  const showSkeleton =
    isStartFreshPending ||
    isDemoExitPending ||
    (isDemo && phase === MazeGamePhase.WIN) ||
    (!isTerminalPhase && !isGameReady);

  if (showSkeleton) {
    return <LiveGameRouteSkeleton {...skeletonProps} />;
  }

  if (showPlay) {
    return (
      <MazeTemplate
        phase={phase}
        level={level}
        timer={timer}
        playMode={mode}
        soundEffectsEnabled={soundEffectsEnabled}
        onToggleSoundEffects={setSoundEffectsEnabled}
        onStartFresh={handleStartFresh}
        isStartFreshPending={isStartFreshPending}
        onDone={isDemo ? handleDone : undefined}
      />
    );
  }

  return <LiveGameRouteSkeleton {...skeletonProps} />;
}
