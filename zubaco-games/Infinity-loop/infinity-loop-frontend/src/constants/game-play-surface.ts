export const GAME_PLAY_SURFACE = {
  TUTORIAL: "tutorial",
  LIVE: "live",
} as const;

export type GamePlaySurface =
  (typeof GAME_PLAY_SURFACE)[keyof typeof GAME_PLAY_SURFACE];
