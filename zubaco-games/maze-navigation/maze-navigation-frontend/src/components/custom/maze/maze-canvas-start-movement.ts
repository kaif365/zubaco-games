import { MAZE_MOVE_INPUT_COOLDOWN_MS } from "@/constants/maze";
import { useDemoStore } from "@/store/demo";
import { Direction, type MazeCell } from "@/types/maze";
import { dispatchMazePickSideAudio } from "@/types/maze-audio-events";
import { isDemoTutorialInputBlocked } from "@/utils/maze/demo-tutorial";
import { gsap } from "gsap";
import type * as PIXI from "pixi.js";
import type { RefObject } from "react";
import type {
  ActiveTravelSegment,
  PlayerState,
  TravelArrivalOptions,
} from "./maze-canvas-types";
import { PlayerState as PlayerStateEnum } from "./maze-canvas-types";

export interface StartMovementContext {
  readonly lastMoveInputAtRef: RefObject<number>;
  readonly playerStateRef: RefObject<PlayerState>;
  readonly activeTravelRef: RefObject<ActiveTravelSegment | null>;
  readonly playerRef: RefObject<PIXI.Container | null>;
  readonly playerRollBandRef: RefObject<PIXI.Graphics | null>;
  readonly playerSpecularRef: RefObject<PIXI.Graphics | null>;
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
  readonly goalCellRef: RefObject<{ x: number; y: number }>;
  readonly positionRef: RefObject<{ x: number; y: number }>;
  readonly mazeRef: RefObject<MazeCell[][]>;
  readonly junctionArrowRevealTokenRef: RefObject<number>;
  readonly moveToCellRef: RefObject<
    (startX: number, startY: number, dir: Direction) => void
  >;
  readonly cancelIdleFlush: () => void;
  readonly clearJunctionArrows: () => void;
}

export function createStartMovement(
  ctx: StartMovementContext,
): (direction: Direction) => void {
  return (direction: Direction) => {
    const { demoTutorialStep } = useDemoStore.getState();
    if (isDemoTutorialInputBlocked(demoTutorialStep)) {
      return;
    }

    const now = performance.now();
    if (now - ctx.lastMoveInputAtRef.current < MAZE_MOVE_INPUT_COOLDOWN_MS) {
      return;
    }

    if (ctx.playerStateRef.current === PlayerStateEnum.TRAVELING) {
      const seg = ctx.activeTravelRef.current;
      const player = ctx.playerRef.current;
      const rollBand = ctx.playerRollBandRef.current;
      const specular = ctx.playerSpecularRef.current;
      if (!seg || !player || !rollBand || !specular) {
        return;
      }

      if (direction === seg.direction) {
        return;
      }

      ctx.lastMoveInputAtRef.current = now;

      gsap.killTweensOf(player);
      gsap.killTweensOf(rollBand);
      gsap.killTweensOf(specular);

      player.x = seg.targetX;
      player.y = seg.targetY;
      ctx.activeTravelRef.current = null;

      const applyArrival = ctx.applyTravelArrivalRef.current;
      if (!applyArrival) {
        return;
      }
      applyArrival(
        seg.nextX,
        seg.nextY,
        seg.direction,
        seg.recordLiveMoveOnArrival,
        { skipAutoNext: true },
      );

      const g = ctx.goalCellRef.current;
      const pos = ctx.positionRef.current;
      if (pos.x === g.x && pos.y === g.y) {
        return;
      }

      const currentCell = ctx.mazeRef.current[pos.y]?.[pos.x];
      if (!currentCell || !(currentCell.walls & direction)) {
        return;
      }

      ctx.junctionArrowRevealTokenRef.current += 1;

      if (direction !== seg.direction) {
        dispatchMazePickSideAudio();
      }
      ctx.clearJunctionArrows();
      ctx.playerStateRef.current = PlayerStateEnum.TRAVELING;
      ctx.moveToCellRef.current(pos.x, pos.y, direction);
      return;
    }

    ctx.lastMoveInputAtRef.current = now;
    ctx.cancelIdleFlush();

    const { x, y } = ctx.positionRef.current;
    const currentCell = ctx.mazeRef.current[y]?.[x];
    if (!currentCell || !(currentCell.walls & direction)) {
      return;
    }

    ctx.junctionArrowRevealTokenRef.current += 1;

    if (ctx.playerStateRef.current === PlayerStateEnum.JUNCTION_WAIT) {
      dispatchMazePickSideAudio();
    }
    ctx.clearJunctionArrows();
    ctx.playerStateRef.current = PlayerStateEnum.TRAVELING;
    ctx.moveToCellRef.current(x, y, direction);
  };
}
