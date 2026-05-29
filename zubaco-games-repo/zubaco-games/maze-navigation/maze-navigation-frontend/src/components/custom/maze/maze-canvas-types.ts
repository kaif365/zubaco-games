import type { MoveDirection } from "@/types/api/game";
import type { Direction } from "@/types/maze";

export enum PlayerState {
  IDLE,
  TRAVELING,
  JUNCTION_WAIT,
}

export type MazeMoveEventDetail = {
  readonly direction: string;
};

export const MAX_MAZE_DIM = 31;

export interface ActiveTravelSegment {
  readonly nextX: number;
  readonly nextY: number;
  readonly targetX: number;
  readonly targetY: number;
  readonly direction: Direction;
  readonly recordLiveMoveOnArrival: boolean;
}

export interface PendingLiveMove {
  readonly moveId: string;
  readonly direction: MoveDirection;
  readonly movedAt: string;
}

export interface TravelArrivalOptions {
  readonly skipAutoNext: boolean;
}
