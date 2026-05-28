import {
  handleGoalReached,
  type GoalReachedLiveActions,
} from "@/components/custom/maze/maze-canvas-goal";
import type {
  ActiveTravelSegment,
  PendingLiveMove,
  PlayerState,
  TravelArrivalOptions,
} from "@/components/custom/maze/maze-canvas-types";
import { PlayerState as PlayerStateEnum } from "@/components/custom/maze/maze-canvas-types";
import {
  MAZE_JUNCTION_ARROW_REVEAL_DELAY_MS,
  MAZE_SUBMIT_MOVES_MIN_JUNCTION_EXITS,
} from "@/constants/maze";
import { animatePlayerRoll as runPlayerRollAnimation } from "@/lib/maze/maze-canvas-animate-roll";
import {
  cellCenter,
  getCellExits,
  isSteppingBackAlongTrail,
} from "@/lib/maze/maze-canvas-cell-helpers";
import { delayMs } from "@/lib/maze/maze-canvas-delay";
import { directionToMoveApi } from "@/lib/maze/maze-direction-to-move-api";
import { getDirectionVector } from "@/lib/maze/maze-gen";
import { Direction, type MazeCell } from "@/types/maze";
import { dispatchMazePickSideAudio } from "@/types/maze-audio-events";
import type { MazeGamePhase } from "@/types/maze-phase";
import { gsap } from "gsap";
import type * as PIXI from "pixi.js";
import { useEffect, type RefObject } from "react";

interface UseMazeCanvasTravelParams {
  readonly mazeRef: RefObject<MazeCell[][]>;
  readonly playerStateRef: RefObject<PlayerState>;
  readonly positionRef: RefObject<{ x: number; y: number }>;
  readonly goalCellRef: RefObject<{ x: number; y: number }>;
  readonly isLiveGameRef: RefObject<boolean>;
  readonly pendingLiveMovesRef: RefObject<PendingLiveMove[]>;
  readonly trailPointsRef: RefObject<Array<{ x: number; y: number }>>;
  readonly playerRef: RefObject<PIXI.Container | null>;
  readonly playerRollBandRef: RefObject<PIXI.Graphics | null>;
  readonly playerSpecularRef: RefObject<PIXI.Graphics | null>;
  readonly activeTravelRef: RefObject<ActiveTravelSegment | null>;
  readonly applyTravelArrivalRef: RefObject<
    | ((
        nextX: number,
        nextY: number,
        direction: Direction,
        recordLiveMoveOnArrival: boolean,
        options: TravelArrivalOptions,
      ) => void)
    | null
  >;
  readonly moveToCellRef: RefObject<
    (startX: number, startY: number, dir: Direction) => void
  >;
  readonly junctionArrowRevealTokenRef: RefObject<number>;
  readonly demoGoalHandledRef: RefObject<boolean>;
  readonly timerRef: RefObject<number>;
  readonly flushPendingLiveMoves: () => Promise<void>;
  readonly flushPendingLiveMovesImmediate: () => Promise<void>;
  readonly scheduleIdleFlush: () => void;
  readonly cancelIdleFlush: () => void;
  readonly showJunctionArrowsAt: (x: number, y: number) => void;
  readonly advanceRoundAfterReachingEnd: () => Promise<{
    endBoard: { roundScore: number };
    endGame: { totalScore: number } | null;
  }>;
  readonly setPhase: (phase: MazeGamePhase) => void;
  readonly onDemoGoal: (timer: number) => void;
  readonly liveGoalActions?: GoalReachedLiveActions;
}

export function useMazeCanvasTravel({
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
}: UseMazeCanvasTravelParams): void {
  useEffect(() => {
    const scheduleJunctionArrowsAfterStop = (
      jx: number,
      jy: number,
      exitCount: number,
    ) => {
      junctionArrowRevealTokenRef.current += 1;
      const token = junctionArrowRevealTokenRef.current;
      const stillWaitingAtJunction = (): boolean =>
        playerStateRef.current === PlayerStateEnum.JUNCTION_WAIT &&
        positionRef.current.x === jx &&
        positionRef.current.y === jy;

      scheduleIdleFlush();

      void (async () => {
        if (exitCount >= MAZE_SUBMIT_MOVES_MIN_JUNCTION_EXITS) {
          await flushPendingLiveMoves();
        }
        if (
          junctionArrowRevealTokenRef.current !== token ||
          !stillWaitingAtJunction()
        ) {
          return;
        }
        await delayMs(MAZE_JUNCTION_ARROW_REVEAL_DELAY_MS);
        if (
          junctionArrowRevealTokenRef.current !== token ||
          !stillWaitingAtJunction()
        ) {
          return;
        }
        showJunctionArrowsAt(jx, jy);
      })();
    };

    const applyTravelArrival = (
      nextX: number,
      nextY: number,
      direction: Direction,
      recordLiveMoveOnArrival: boolean,
      options: TravelArrivalOptions,
    ): void => {
      positionRef.current = { x: nextX, y: nextY };

      if (recordLiveMoveOnArrival) {
        pendingLiveMovesRef.current.push({
          moveId: crypto.randomUUID(),
          direction: directionToMoveApi(direction),
          movedAt: new Date().toISOString(),
        });
      }

      const { x: targetX, y: targetY } = cellCenter(nextX, nextY);
      const trailTail = trailPointsRef.current.at(-1);
      if (trailTail?.x !== targetX || trailTail?.y !== targetY) {
        trailPointsRef.current.push({ x: targetX, y: targetY });
      }

      const goal = goalCellRef.current;
      if (nextX === goal.x && nextY === goal.y) {
        handleGoalReached({
          isLiveGame: isLiveGameRef.current,
          demoGoalHandled: demoGoalHandledRef.current,
          timer: timerRef.current,
          flushPendingLiveMovesImmediate,
          advanceRoundAfterReachingEnd,
          setPhase,
          setPlayerState: (state) => {
            playerStateRef.current = state;
          },
          markDemoGoalHandled: () => {
            demoGoalHandledRef.current = true;
          },
          onDemoGoal,
          liveActions: liveGoalActions,
        });
        return;
      }

      const nextCell = mazeRef.current[nextY]?.[nextX];
      if (!nextCell) {
        playerStateRef.current = PlayerStateEnum.IDLE;
        return;
      }

      const exits = getCellExits(nextCell, direction);

      if (
        exits.length === 1 &&
        exits[0] !== undefined &&
        !options.skipAutoNext
      ) {
        const nextDirection = exits[0];
        if (nextDirection !== direction) {
          dispatchMazePickSideAudio();
        }
        moveToCellRef.current(nextX, nextY, nextDirection);
        return;
      }

      if (exits.length === 0) {
        playerStateRef.current = PlayerStateEnum.IDLE;
        scheduleIdleFlush();
        return;
      }

      playerStateRef.current = PlayerStateEnum.JUNCTION_WAIT;
      scheduleJunctionArrowsAfterStop(nextX, nextY, exits.length);
    };

    applyTravelArrivalRef.current = applyTravelArrival;

    moveToCellRef.current = (
      startX: number,
      startY: number,
      direction: Direction,
    ) => {
      const { dx, dy } = getDirectionVector(direction);
      const nextX = startX + dx;
      const nextY = startY + dy;
      const player = playerRef.current;
      if (!player) {
        return;
      }

      const { x: targetX, y: targetY } = cellCenter(nextX, nextY);
      const { x: startCenterX, y: startCenterY } = cellCenter(startX, startY);
      const trailPoints = trailPointsRef.current;
      const steppingBackAlongTrail = isSteppingBackAlongTrail(
        trailPoints,
        startCenterX,
        startCenterY,
        targetX,
        targetY,
      );

      if (steppingBackAlongTrail) {
        trailPoints.pop();
        if (isLiveGameRef.current) {
          pendingLiveMovesRef.current.pop();
        }
      }

      const recordLiveMoveOnArrival =
        isLiveGameRef.current && !steppingBackAlongTrail;

      cancelIdleFlush();

      activeTravelRef.current = {
        nextX,
        nextY,
        targetX,
        targetY,
        direction,
        recordLiveMoveOnArrival,
      };

      const rollBand = playerRollBandRef.current;
      const specular = playerSpecularRef.current;
      if (rollBand && specular) {
        runPlayerRollAnimation(player, rollBand, specular, direction);
      }

      gsap.to(player, {
        x: targetX,
        y: targetY,
        duration: 0.15,
        ease: "none",
        overwrite: "auto",
        onComplete: () => {
          activeTravelRef.current = null;
          applyTravelArrival(nextX, nextY, direction, recordLiveMoveOnArrival, {
            skipAutoNext: false,
          });
        },
      });
    };

    return () => {
      applyTravelArrivalRef.current = null;
    };
  }, [
    activeTravelRef,
    advanceRoundAfterReachingEnd,
    applyTravelArrivalRef,
    cancelIdleFlush,
    demoGoalHandledRef,
    flushPendingLiveMoves,
    flushPendingLiveMovesImmediate,
    goalCellRef,
    isLiveGameRef,
    junctionArrowRevealTokenRef,
    moveToCellRef,
    mazeRef,
    pendingLiveMovesRef,
    playerRef,
    playerRollBandRef,
    playerSpecularRef,
    playerStateRef,
    positionRef,
    scheduleIdleFlush,
    setPhase,
    showJunctionArrowsAt,
    timerRef,
    trailPointsRef,
    onDemoGoal,
    liveGoalActions,
  ]);
}
