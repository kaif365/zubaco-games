import { DYNAMIC_ROUND_INSET_SCALE } from "@/constants/loop-scene";
import { TileBitmaskKey } from "../constants/tile-bitmasks";

export interface MockLevelDefinition {
  width: number;
  height: number;
  tiles: TileBitmaskKey[][];
  mobileInsetScale?: number;
}

export const MOCK_LEVELS: MockLevelDefinition[] = [
  // Level 1: Horizontal 8 figure (compact)
  {
    width: 3,
    height: 2,
    mobileInsetScale: DYNAMIC_ROUND_INSET_SCALE.MOBILE_3,
    tiles: [
      ["CORNER_ES", "CURVED_V_ESW", "CORNER_SW"],
      ["CORNER_NE", "CURVED_V_NEW", "CORNER_WN"],
    ],
  },
  // Level 2: Two horizontal circles
  {
    width: 5,
    height: 2,
    tiles: [
      ["CORNER_ES", "CORNER_SW", "EMPTY", "CORNER_ES", "CORNER_SW"],
      ["CORNER_NE", "CORNER_WN", "EMPTY", "CORNER_NE", "CORNER_WN"],
    ],
  },
  // Level 3: Single box loop
  {
    width: 3,
    height: 3,
    tiles: [
      ["CORNER_ES", "STRAIGHT_H", "CORNER_SW"],
      ["STRAIGHT_V", "EMPTY", "STRAIGHT_V"],
      ["CORNER_NE", "STRAIGHT_H", "CORNER_WN"],
    ],
  },
  // Level 4: Cross core with frame
  {
    width: 5,
    height: 5,
    tiles: [
      ["CORNER_ES", "STRAIGHT_H", "T_ESW", "STRAIGHT_H", "CORNER_SW"],
      ["STRAIGHT_V", "EMPTY", "STRAIGHT_V", "EMPTY", "STRAIGHT_V"],
      ["T_NES", "STRAIGHT_H", "CROSS", "STRAIGHT_H", "T_NSW"],
      ["STRAIGHT_V", "EMPTY", "STRAIGHT_V", "EMPTY", "STRAIGHT_V"],
      ["CORNER_NE", "STRAIGHT_H", "T_NES", "STRAIGHT_H", "CORNER_WN"],
    ],
  },
  // Level 5: Wider loop lattice
  {
    width: 6,
    height: 4,
    tiles: [
      ["CORNER_ES", "STRAIGHT_H", "T_ESW", "T_ESW", "STRAIGHT_H", "CORNER_SW"],
      [
        "STRAIGHT_V",
        "EMPTY",
        "STRAIGHT_V",
        "STRAIGHT_V",
        "EMPTY",
        "STRAIGHT_V",
      ],
      [
        "STRAIGHT_V",
        "EMPTY",
        "STRAIGHT_V",
        "STRAIGHT_V",
        "EMPTY",
        "STRAIGHT_V",
      ],
      ["CORNER_NE", "STRAIGHT_H", "T_NES", "T_NES", "STRAIGHT_H", "CORNER_WN"],
    ],
  },
];
