import { TileType } from "@/types/tile";

export const DIRECTION_MASK = {
  N: 0b0001,
  E: 0b0010,
  S: 0b0100,
  W: 0b1000,
} as const;

export interface TileBitmaskDefinition {
  key: string;
  type: TileType;
  rotation: number;
  bitmask: number;
}

export const TILE_BITMASK_DEFINITIONS: TileBitmaskDefinition[] = [
  { key: "EMPTY", type: TileType.EMPTY, rotation: 0, bitmask: 0b0000 },
  { key: "END_N", type: TileType.CAP, rotation: 0, bitmask: 0b0001 },
  { key: "END_E", type: TileType.CAP, rotation: 1, bitmask: 0b0010 },
  { key: "END_S", type: TileType.CAP, rotation: 2, bitmask: 0b0100 },
  { key: "END_W", type: TileType.CAP, rotation: 3, bitmask: 0b1000 },
  { key: "STRAIGHT_V", type: TileType.STRAIGHT, rotation: 0, bitmask: 0b0101 },
  { key: "STRAIGHT_H", type: TileType.STRAIGHT, rotation: 1, bitmask: 0b1010 },
  { key: "CORNER_NE", type: TileType.ELBOW, rotation: 0, bitmask: 0b0011 },
  { key: "CORNER_ES", type: TileType.ELBOW, rotation: 1, bitmask: 0b0110 },
  { key: "CORNER_SW", type: TileType.ELBOW, rotation: 2, bitmask: 0b1100 },
  { key: "CORNER_WN", type: TileType.ELBOW, rotation: 3, bitmask: 0b1001 },
  { key: "T_NES", type: TileType.TEE, rotation: 0, bitmask: 0b0111 },
  { key: "T_ESW", type: TileType.TEE, rotation: 1, bitmask: 0b1110 },
  { key: "T_NSW", type: TileType.TEE, rotation: 2, bitmask: 0b1101 },
  { key: "T_NEW", type: TileType.TEE, rotation: 3, bitmask: 0b1011 },
  { key: "CROSS", type: TileType.CROSS, rotation: 0, bitmask: 0b1111 },
  // Extended CURVED_V variants (same edge masks as T, rendered differently).
  {
    key: "CURVED_V_NES",
    type: TileType.CURVED_V,
    rotation: 0,
    bitmask: 0b0111,
  },
  {
    key: "CURVED_V_ESW",
    type: TileType.CURVED_V,
    rotation: 1,
    bitmask: 0b1110,
  },
  {
    key: "CURVED_V_NSW",
    type: TileType.CURVED_V,
    rotation: 2,
    bitmask: 0b1101,
  },
  {
    key: "CURVED_V_NEW",
    type: TileType.CURVED_V,
    rotation: 3,
    bitmask: 0b1011,
  },
];

export type TileBitmaskKey = (typeof TILE_BITMASK_DEFINITIONS)[number]["key"];
