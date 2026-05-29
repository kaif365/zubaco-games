import { MAZE_COLS, MAZE_ROWS } from '@/constants/maze';
import { useMazeCanvasTravel } from '@/hooks/use-maze-canvas-travel';
import { useMazeLiveMoveFlush } from '@/hooks/use-maze-live-move-flush';
import type { CometSample } from '@/lib/maze/maze-canvas-comet';
import { clearJunctionArrows, drawJunctionArrows } from '@/lib/maze/maze-canvas-junction-arrows';
import {
  applyDemoTutorialPixiStep,
  createEmptyDemoTutorialPixiHandles,
  disposeDemoTutorialPixiHandles,
  type DemoTutorialPixiHandles,
} from '@/lib/maze/maze-demo-tutorial-pixi';
import { getCurrentDemoLevel, useDemoStore } from '@/store/demo';
import { useLiveStore } from '@/store/live';
import { APP_COLOR } from '@/theme/color';
import { getMazePixiPalette, type MazeStagePixiPalette } from '@/theme/maze-stage-palette';
import { Direction, type MazeCell } from '@/types/maze';
import { MazeGamePhase } from '@/types/maze-phase';
import { isDemoTutorialActive } from '@/utils/maze/demo-tutorial';
import { findShortestPath } from '@/utils/maze/find-shortest-path';
import { MazePlayMode } from '@/utils/maze/maze-play-mode';
import * as PIXI from 'pixi.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { buildMazeCanvasScene } from './maze-canvas-build-scene';
import { createStartMovement } from './maze-canvas-start-movement';
import {
  PlayerState,
  type ActiveTravelSegment,
  type PendingLiveMove,
  type TravelArrivalOptions,
} from './maze-canvas-types';
import { useMazePixiApp } from './use-maze-pixi-app';

export function MazeCanvas({ playMode }: Readonly<{ playMode: MazePlayMode }>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const applyCanvasLayoutRef = useRef<(() => void) | null>(null);
  const isDemo = playMode === MazePlayMode.Demo;

  const demoPhase = useDemoStore((s) => s.phase);
  const livePhase = useLiveStore((s) => s.phase);
  const phase = isDemo ? demoPhase : livePhase;

  const demoTimer = useDemoStore((s) => s.timer);
  const liveTimer = useLiveStore((s) => s.timer);
  const timer = isDemo ? demoTimer : liveTimer;

  const liveMaze = useLiveStore((s) => (isDemo ? null : (s.session?.maze ?? null)));
  const liveMazeId = liveMaze?.sessionMazeId ?? null;
  const demoLevel = useDemoStore((s) => (isDemo ? getCurrentDemoLevel(s) : null));
  const demoLevelId = demoLevel?.levelId ?? null;
  const hasActiveLiveSession = useLiveStore((s) => s.hasActiveLiveSession);
  const liveScore = useLiveStore((s) => s.score);
  const liveSession = useLiveStore((s) => s.session);
  const reachDemoGoal = useDemoStore((s) => s.reachDemoGoal);
  const demoTutorialStep = useDemoStore((s) => s.demoTutorialStep);

  const {
    submitMoves,
    fetchStatus,
    advanceRoundAfterReachingEnd,
    setPhase,
    setScore,
    finishLiveSuccess,
    setTimer: setLiveTimer,
  } = useLiveStore(
    useShallow((s) => ({
      submitMoves: s.submitMoves,
      fetchStatus: s.fetchStatus,
      advanceRoundAfterReachingEnd: s.advanceRoundAfterReachingEnd,
      setPhase: s.setPhase,
      setScore: s.setScore,
      finishLiveSuccess: s.finishLiveSuccess,
      setTimer: s.setTimer,
    })),
  );

  const onDemoGoal = useCallback(
    (timerValue: number) => {
      reachDemoGoal(timerValue);
    },
    [reachDemoGoal],
  );

  const liveGoalActions = useMemo(() => {
    if (isDemo) {
      return undefined;
    }
    return {
      setScore,
      finishLiveSuccess,
      setTimer: setLiveTimer,
      readSessionExpiryAt: () => liveSession?.expiryAt,
      readTotalScore: () => liveSession?.scoreboard.totalScore,
      readCurrentScore: () => liveScore,
    };
  }, [finishLiveSuccess, isDemo, liveScore, liveSession, setLiveTimer, setScore]);

  const [, setMaze] = useState<MazeCell[][]>([]);
  const mazeRef = useRef<MazeCell[][]>([]);
  const playerStateRef = useRef<PlayerState>(PlayerState.IDLE);
  const positionRef = useRef({ x: 0, y: 0 });
  const goalCellRef = useRef({ x: MAZE_COLS - 1, y: MAZE_ROWS - 1 });
  const mazeColsRef = useRef(MAZE_COLS);
  const mazeRowsRef = useRef(MAZE_ROWS);
  const isLiveGameRef = useRef(false);
  const pendingLiveMovesRef = useRef<PendingLiveMove[]>([]);
  const trailRef = useRef<PIXI.Graphics | null>(null);
  const playerRef = useRef<PIXI.Container | null>(null);
  const playerRollBandRef = useRef<PIXI.Graphics | null>(null);
  const playerSpecularRef = useRef<PIXI.Graphics | null>(null);
  const trailPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const cometSamplesRef = useRef<CometSample[]>([]);
  const junctionLayerRef = useRef<PIXI.Container | null>(null);
  const beaconRef = useRef<PIXI.Container | null>(null);
  const tutorialLayerRef = useRef<PIXI.Container | null>(null);
  const tutorialPixiHandlesRef = useRef<DemoTutorialPixiHandles>(
    createEmptyDemoTutorialPixiHandles(),
  );
  const timerRef = useRef(timer);
  const phaseRef = useRef(phase);
  const moveToCellRef = useRef<(startX: number, startY: number, dir: Direction) => void>(() => {});
  const handleMoveRef = useRef<(direction: string | Direction) => void>(() => {});
  const activeTravelRef = useRef<ActiveTravelSegment | null>(null);
  const applyTravelArrivalRef = useRef<
    | ((
        nextX: number,
        nextY: number,
        direction: Direction,
        recordLiveMoveOnArrival: boolean,
        options: TravelArrivalOptions,
      ) => void)
    | null
  >(null);
  const junctionArrowRevealTokenRef = useRef(0);
  const demoGoalHandledRef = useRef(false);
  const lastMoveInputAtRef = useRef(0);
  const mazePaletteRef = useRef<MazeStagePixiPalette>(getMazePixiPalette());

  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const clearJunctionArrowsOnLayer = useCallback(() => {
    const layer = junctionLayerRef.current;
    if (layer) {
      clearJunctionArrows(layer);
    }
  }, []);

  const showJunctionArrowsAt = useCallback((x: number, y: number) => {
    const junctionLayer = junctionLayerRef.current;
    const row = mazeRef.current[y];
    if (!junctionLayer || !row) {
      return;
    }
    drawJunctionArrows(junctionLayer, row, x, y, mazePaletteRef.current);
  }, []);

  const {
    flushPendingLiveMoves,
    cancelIdleFlush,
    scheduleIdleFlush,
    flushPendingLiveMovesImmediate,
  } = useMazeLiveMoveFlush({
    isLiveGameRef,
    pendingLiveMovesRef,
    submitMoves,
    fetchStatus,
  });

  useMazeCanvasTravel({
    mazeRef,
    playerStateRef,
    positionRef,
    goalCellRef,
    isLiveGameRef,
    pendingLiveMovesRef,
    trailPointsRef,
    playerRef,
    playerRollBandRef,
    playerSpecularRef,
    activeTravelRef,
    applyTravelArrivalRef,
    moveToCellRef,
    junctionArrowRevealTokenRef,
    demoGoalHandledRef,
    timerRef,
    flushPendingLiveMoves,
    flushPendingLiveMovesImmediate,
    scheduleIdleFlush,
    cancelIdleFlush,
    showJunctionArrowsAt,
    advanceRoundAfterReachingEnd,
    setPhase,
    onDemoGoal,
    liveGoalActions,
  });

  const startMovement = useCallback(
    (direction: Direction) => {
      createStartMovement({
        lastMoveInputAtRef,
        playerStateRef,
        activeTravelRef,
        playerRef,
        playerRollBandRef,
        playerSpecularRef,
        applyTravelArrivalRef,
        goalCellRef,
        positionRef,
        mazeRef,
        junctionArrowRevealTokenRef,
        moveToCellRef,
        cancelIdleFlush,
        clearJunctionArrows: clearJunctionArrowsOnLayer,
      })(direction);
    },
    [cancelIdleFlush, clearJunctionArrowsOnLayer],
  );

  const hasPlayableMaze = useCallback((): boolean => {
    if (isDemo) {
      return demoLevel !== null;
    }
    return hasActiveLiveSession && liveMaze !== null;
  }, [demoLevel, hasActiveLiveSession, isDemo, liveMaze]);

  const initializeGame = useCallback(() => {
    const app = appRef.current;
    if (!app || !hasPlayableMaze()) {
      return;
    }
    demoGoalHandledRef.current = false;
    buildMazeCanvasScene(
      app,
      playMode,
      {
        liveMaze: isDemo ? null : liveMaze,
        demoLevel: isDemo ? demoLevel : null,
      },
      setMaze,
      {
        goalCellRef,
        mazeColsRef,
        mazeRowsRef,
        isLiveGameRef,
        pendingLiveMovesRef,
        mazeRef,
        positionRef,
        playerStateRef,
        trailPointsRef,
        cometSamplesRef,
        junctionLayerRef,
        trailRef,
        playerRef,
        playerRollBandRef,
        playerSpecularRef,
        beaconRef,
        tutorialLayerRef,
      },
      mazePaletteRef,
      showJunctionArrowsAt,
      applyCanvasLayoutRef,
    );
    disposeDemoTutorialPixiHandles(tutorialPixiHandlesRef.current);
    tutorialPixiHandlesRef.current = createEmptyDemoTutorialPixiHandles();

    if (isDemo && isDemoTutorialActive(useDemoStore.getState().demoTutorialStep)) {
      applyDemoTutorialPixiStep(useDemoStore.getState().demoTutorialStep, {
        player: playerRef.current,
        beacon: beaconRef.current,
        tutorialLayer: tutorialLayerRef.current,
        pathCells: findShortestPath(
          demoLevel!.mazeGrid,
          demoLevel!.startRow,
          demoLevel!.startCol,
          demoLevel!.endRow,
          demoLevel!.endCol,
        ),
        handles: tutorialPixiHandlesRef.current,
      });
    }
  }, [demoLevel, hasPlayableMaze, isDemo, liveMaze, playMode, showJunctionArrowsAt]);

  const demoTutorialPath = useMemo(() => {
    if (!isDemo || !demoLevel) {
      return [];
    }
    return findShortestPath(
      demoLevel.mazeGrid,
      demoLevel.startRow,
      demoLevel.startCol,
      demoLevel.endRow,
      demoLevel.endCol,
    );
  }, [demoLevel, isDemo]);

  useEffect(() => {
    if (!isDemo || !isDemoTutorialActive(demoTutorialStep)) {
      disposeDemoTutorialPixiHandles(tutorialPixiHandlesRef.current);
      tutorialPixiHandlesRef.current = createEmptyDemoTutorialPixiHandles();
      return;
    }

    applyDemoTutorialPixiStep(demoTutorialStep, {
      player: playerRef.current,
      beacon: beaconRef.current,
      tutorialLayer: tutorialLayerRef.current,
      pathCells: demoTutorialPath,
      handles: tutorialPixiHandlesRef.current,
    });

    return () => {
      disposeDemoTutorialPixiHandles(tutorialPixiHandlesRef.current);
      tutorialPixiHandlesRef.current = createEmptyDemoTutorialPixiHandles();
    };
  }, [demoLevelId, demoTutorialPath, demoTutorialStep, isDemo]);

  useEffect(() => {
    handleMoveRef.current = (direction: string | Direction) => {
      if (phaseRef.current !== MazeGamePhase.PLAYING) {
        return;
      }

      const parsedDirection =
        typeof direction === 'string' ? Direction[direction as keyof typeof Direction] : direction;
      if (parsedDirection === undefined) {
        return;
      }

      startMovement(parsedDirection);
    };
  }, [startMovement]);

  useMazePixiApp(
    containerRef,
    appRef,
    applyCanvasLayoutRef,
    handleMoveRef,
    trailRef,
    playerRef,
    cometSamplesRef,
    mazePaletteRef,
  );

  useEffect(() => {
    if (phase === MazeGamePhase.PLAYING && appRef.current && hasPlayableMaze()) {
      initializeGame();
    }
  }, [demoLevelId, hasPlayableMaze, initializeGame, liveMazeId, phase, playMode]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden select-none touch-none"
      style={{ background: APP_COLOR.black }}
    />
  );
}
