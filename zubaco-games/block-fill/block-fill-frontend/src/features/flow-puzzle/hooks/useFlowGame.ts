import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flowLevelPacks } from '@/features/flow-puzzle/data/mockLevels';
import {
  beginPathDraw,
  calculateScore,
  createFlowSession,
  dragPathToCell,
  endPathDraw,
  getBoardStats,
  isPuzzleSolved,
  resetFlowSession,
} from '@/features/flow-puzzle/engine/flowEngine';
import type {
  FlowPuzzleLevel,
  FlowSessionState,
  FlowWinSummary,
  GridCoord,
} from '@/features/flow-puzzle/types';

function getTimestamp() {
  return Date.now();
}

function computeLiveElapsed(elapsedMs: number, timerAnchorMs: number | null) {
  return timerAnchorMs === null ? elapsedMs : Math.max(0, getTimestamp() - timerAnchorMs);
}

export interface FlowSessionTransitionHandlers {
  onAfterBeginPath?(prev: FlowSessionState, next: FlowSessionState): void;
  onAfterDragPath?(prev: FlowSessionState, next: FlowSessionState): void;
  onAfterEndPath?(prev: FlowSessionState, next: FlowSessionState): void;
}

function scheduleTransition(
  fn: ((prev: FlowSessionState, next: FlowSessionState) => void) | undefined,
  prev: FlowSessionState,
  next: FlowSessionState,
) {
  if (!fn || next === prev) return;
  queueMicrotask(() => {
    fn(prev, next);
  });
}

export function useFlowGame(transitionHandlers?: FlowSessionTransitionHandlers) {
  const transitionHandlersRef = useRef(transitionHandlers);
  useLayoutEffect(() => {
    transitionHandlersRef.current = transitionHandlers;
  }, [transitionHandlers]);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [playlistLevels, setPlaylistLevels] = useState<FlowPuzzleLevel[] | null>(null);
  const [selectedLevelIndex, setSelectedLevelIndex] = useState(0);
  const [session, setSession] = useState<FlowSessionState | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof getBoardStats> | null>(null);
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timerAnchorMs, setTimerAnchorMs] = useState<number | null>(null);
  const [winSummary, setWinSummary] = useState<FlowWinSummary | null>(null);
  const [sessionHistory, setSessionHistory] = useState<FlowSessionState[]>([]);
  const [hintsRemaining, setHintsRemaining] = useState(3);

  const selectedPack = flowLevelPacks.find((pack) => pack.id === selectedPackId) ?? null;
  const currentLevel =
    playlistLevels?.[selectedLevelIndex] ?? selectedPack?.levels[selectedLevelIndex] ?? null;
  const hasNextLevel =
    playlistLevels !== null
      ? selectedLevelIndex < playlistLevels.length - 1
      : selectedPack !== null && selectedLevelIndex < selectedPack.levels.length - 1;

  useEffect(() => {
    if (!currentLevel || paused || winSummary || timerAnchorMs === null) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedMs(Math.max(0, getTimestamp() - timerAnchorMs));
    }, 100);

    return () => window.clearInterval(timer);
  }, [currentLevel, paused, timerAnchorMs, winSummary]);

  // Auto-pause on tab switch
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && currentLevel && !paused && !winSummary && timerAnchorMs !== null) {
        const nextElapsed = computeLiveElapsed(elapsedMs, timerAnchorMs);
        setElapsedMs(nextElapsed);
        setTimerAnchorMs(null);
        setPaused(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [currentLevel, paused, winSummary, timerAnchorMs, elapsedMs]);

  const openLevelAtIndex = (packId: string, levelIndex: number, level: FlowPuzzleLevel) => {
    const nextSession = createFlowSession(level);
    setSelectedPackId(packId);
    setSelectedLevelIndex(levelIndex);
    setSession(nextSession);
    setStats(getBoardStats(level, nextSession));
    setPaused(false);
    setElapsedMs(0);
    setTimerAnchorMs(getTimestamp());
    setWinSummary(null);
    setSessionHistory([]);
    setHintsRemaining(3);
  };

  const openPack = (packId: string) => {
    const pack = flowLevelPacks.find((item) => item.id === packId);
    const firstLevel = pack?.levels[0];
    if (!pack || !firstLevel) {
      return;
    }

    openLevelAtIndex(pack.id, 0, firstLevel);
    setPlaylistLevels(null);
  };

  const openPlaylist = (levels: FlowPuzzleLevel[]) => {
    const firstLevel = levels[0];
    if (!firstLevel) {
      return;
    }

    const nextSession = createFlowSession(firstLevel);
    setPlaylistLevels(levels);
    setSelectedPackId(firstLevel.packId);
    setSelectedLevelIndex(0);
    setSession(nextSession);
    setStats(getBoardStats(firstLevel, nextSession));
    setPaused(false);
    setElapsedMs(0);
    setTimerAnchorMs(getTimestamp());
    setWinSummary(null);
  };

  const restorePlaylist = (
    levels: FlowPuzzleLevel[],
    restoredPaths: FlowSessionState['paths'],
    onComplete?: (isSolved: boolean) => void,
  ) => {
    const firstLevel = levels[0];
    if (!firstLevel) {
      return;
    }
    const paths = firstLevel.nodes.reduce<FlowSessionState['paths']>((acc, node) => {
      acc[node.colorId] = restoredPaths[node.colorId] ?? [];
      return acc;
    }, {});
    const restoredSession: FlowSessionState = {
      paths,
      activePath: null,
      moveCount: 0,
      isSolved: false,
    };
    restoredSession.isSolved = isPuzzleSolved(firstLevel, restoredSession);
    // Notify caller synchronously before state updates so it can act on isSolved
    // (e.g. clear the outbox and skip saveProgress when board is already complete).
    onComplete?.(restoredSession.isSolved);

    setPlaylistLevels(levels);
    setSelectedPackId(firstLevel.packId);
    setSelectedLevelIndex(0);
    setSession(restoredSession);
    setStats(getBoardStats(firstLevel, restoredSession));
    setPaused(false);
    setElapsedMs(0);
    setTimerAnchorMs(getTimestamp());
    setWinSummary(null);
  };

  const restartLevel = () => {
    if (!currentLevel) {
      return;
    }

    const nextSession = resetFlowSession(currentLevel);
    setSession(nextSession);
    setStats(getBoardStats(currentLevel, nextSession));
    setPaused(false);
    setElapsedMs(0);
    setTimerAnchorMs(getTimestamp());
    setWinSummary(null);
    setSessionHistory([]);
  };

  const pauseGame = () => {
    const nextElapsed = computeLiveElapsed(elapsedMs, timerAnchorMs);
    setElapsedMs(nextElapsed);
    setTimerAnchorMs(null);
    setPaused(true);
  };

  const resumeGame = () => {
    setPaused(false);
    setTimerAnchorMs(getTimestamp() - elapsedMs);
  };

  const leaveGame = () => {
    setPaused(false);
    setWinSummary(null);
    setTimerAnchorMs(null);
  };

  const goHome = () => {
    setStats(null);
    setSelectedPackId(null);
    setPlaylistLevels(null);
    setSelectedLevelIndex(0);
    setPaused(false);
    setWinSummary(null);
    setTimerAnchorMs(null);
  };

  const goToNextLevel = () => {
    if (!hasNextLevel) {
      leaveGame();
      return;
    }

    const nextIndex = selectedLevelIndex + 1;
    const nextLevel = playlistLevels?.[nextIndex] ?? selectedPack?.levels[nextIndex];
    if (!nextLevel) {
      leaveGame();
      return;
    }

    openLevelAtIndex(nextLevel.packId, nextIndex, nextLevel);
  };

  const handleBeginPath = (coord: GridCoord) => {
    if (!currentLevel || paused || winSummary || !session) {
      return;
    }

    setSession((previous) => {
      if (!previous) {
        return previous;
      }
      const next = beginPathDraw(previous, currentLevel, coord);
      scheduleTransition(transitionHandlersRef.current?.onAfterBeginPath, previous, next);
      return next;
    });
  };

  const handleDragPath = (coord: GridCoord) => {
    if (!currentLevel || paused || winSummary) {
      return;
    }

    setSession((previous) => {
      if (!previous) {
        return previous;
      }
      const next = dragPathToCell(previous, currentLevel, coord);
      scheduleTransition(transitionHandlersRef.current?.onAfterDragPath, previous, next);
      return next;
    });
  };

  const handleEndPath = () => {
    if (!currentLevel || paused || !session) {
      return;
    }

    const nextElapsed = computeLiveElapsed(elapsedMs, timerAnchorMs);
    setElapsedMs(nextElapsed);

    // Save current session to history for undo (before endPathDraw modifies it)
    setSessionHistory((prev) => [...prev.slice(-19), session]);

    setSession((previous) => {
      if (!previous) {
        return previous;
      }

      const next = endPathDraw(previous, currentLevel);
      scheduleTransition(transitionHandlersRef.current?.onAfterEndPath, previous, next);
      setStats(getBoardStats(currentLevel, next));
      if (next.isSolved) {
        setTimerAnchorMs(null);
        setWinSummary({
          elapsedMs: nextElapsed,
          elapsedSec: Math.floor(nextElapsed / 1000),
          score: calculateScore(currentLevel.timeLimitSec, nextElapsed),
        });
      }

      return next;
    });
  };

  const handleUndo = () => {
    if (!currentLevel || sessionHistory.length === 0) {
      return;
    }
    const previousSession = sessionHistory[sessionHistory.length - 1];
    setSessionHistory((prev) => prev.slice(0, -1));
    setSession(previousSession);
    setStats(getBoardStats(currentLevel, previousSession));
  };

  const handleHint = () => {
    if (!currentLevel || !session || hintsRemaining <= 0) {
      return;
    }
    // Hint: clear all paths and let user restart fresh with reduced hint count
    // In a full implementation, this would highlight the correct path for one color
    setHintsRemaining((prev) => prev - 1);
  };

  /**
   * Synthesizes a win-summary for a board that was restored in a fully-solved
   * state so the existing win-handling effect can call completeBoard and advance.
   */
  const triggerWin = () => {
    if (!currentLevel || winSummary) {
      return;
    }
    const elapsed = computeLiveElapsed(elapsedMs, timerAnchorMs);
    setTimerAnchorMs(null);
    setWinSummary({
      elapsedMs: elapsed,
      elapsedSec: Math.floor(elapsed / 1000),
      score: calculateScore(currentLevel.timeLimitSec, elapsed),
    });
  };

  const liveElapsedMs = computeLiveElapsed(elapsedMs, timerAnchorMs);

  return {
    packs: flowLevelPacks,
    selectedPack,
    currentLevel,
    selectedLevelIndex,
    session,
    stats,
    paused,
    elapsedMs: liveElapsedMs,
    winSummary,
    hasNextLevel,
    playlistLevels,
    canUndo: sessionHistory.length > 0,
    hintsRemaining,
    openPack,
    openPlaylist,
    restorePlaylist,
    restartLevel,
    pauseGame,
    resumeGame,
    goToNextLevel,
    leaveGame,
    goHome,
    handleBeginPath,
    handleDragPath,
    handleEndPath,
    handleUndo,
    handleHint,
    triggerWin,
  };
}
