/** Quarter-turn tile rotation tween in `LoopScene` (keep tutorial solved UI delay in sync). */
export const TILE_ROTATION_TWEEN_MS = 400;

export const DYNAMIC_ROUND_INSET_SCALE = {
  DESKTOP: 0.5,
  MOBILE_3: 0.25,
  MOBILE_4: 0.2,
  MOBILE_5: 0.1,
  MOBILE_6_PLUS: 0.05,
} as const;

/** Matches `LoopScene.resolveDynamicRoundInsetScale` for portrait mobile (Phaser-only desktop uses DESKTOP). */
export function resolveDynamicMobileInsetScale(
  longestGridSide: number,
): number {
  if (longestGridSide <= 3) {
    return DYNAMIC_ROUND_INSET_SCALE.MOBILE_3;
  }
  if (longestGridSide <= 4) {
    return DYNAMIC_ROUND_INSET_SCALE.MOBILE_4;
  }
  if (longestGridSide <= 5) {
    return DYNAMIC_ROUND_INSET_SCALE.MOBILE_5;
  }
  return DYNAMIC_ROUND_INSET_SCALE.MOBILE_6_PLUS;
}
