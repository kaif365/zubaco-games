// /modules/game/logic/tile.types.ts
export enum TileType {
  EMPTY = "empty",
  CAP = "cap",
  STRAIGHT = "straight",
  ELBOW = "elbow",
  TEE = "tee",
  CURVED_V = "curved_v",
  CROSS = "cross",
}

export type Directions = {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
};

export interface TileState {
  type: TileType;
  rotation: number; // 0, 1, 2, 3 (degrees = rotation * 90)
  connections: Directions;
}

export interface GridCell extends TileState {
  x: number;
  y: number;
  isCorrect: boolean;
  correctRotation: number;
}
