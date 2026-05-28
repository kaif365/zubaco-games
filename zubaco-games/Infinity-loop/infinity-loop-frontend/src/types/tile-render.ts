export const TILE_RENDER_TYPE = {
  FILLED: "filled",
  OUTLINE: "outline",
} as const;

export type TileRenderType =
  (typeof TILE_RENDER_TYPE)[keyof typeof TILE_RENDER_TYPE];
