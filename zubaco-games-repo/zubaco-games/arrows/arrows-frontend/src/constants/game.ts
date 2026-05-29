// ── Game engine constants ──────────────────────────────────────────────────────
export const MAX_LIVES = 100;
export const MAX_HINTS = 3;

// ── Movement speeds ────────────────────────────────────────────────────────────
export const MOVE_CELLS_PER_SEC = 20;
export const INTRO_CELLS_PER_SEC = 12;
export const INTRO_HEAD_POP_MS = 180;

// ── Visual timing ──────────────────────────────────────────────────────────────
export const FLASH_MS = 2200;

// ── Speed multipliers ──────────────────────────────────────────────────────────
export const NORMAL_REVERSE_MULTIPLIER = 0.35;
export const FAST_REVERSE_MULTIPLIER = 3.2;
export const SERVER_FORWARD_SPEED_MULTIPLIER = 1.2;
export const AUTOPLAY_FORWARD_SPEED_MULTIPLIER = 100;
export const DEMO_FORWARD_SPEED_MULTIPLIER = 0.72;
export const SERVER_BLOCKED_VISUAL_EXTRA_CELLS = 0.7;
export const SERVER_BLOCKED_VISUAL_MAX_MS = 140;

// ── Grid / render ──────────────────────────────────────────────────────────────
export const BASE_GRID_SIZE = 4;
export const BASE_GRID_RENDER_SCALE = 0.58;
export const DEFAULT_BOARD_VIEW_ZOOM = 0.5;

// Designer-tunable snake rendering and motion values. These affect visuals only;
// collision and server move logic still use the original path distances.
export const SNAKE_MOTION = {
  beadRadiusCell: 0.2,
  beadSpacingCell: 0.34,
  beadSpacingRadius: 0.66,
  bodySpriteScale: 1.78,
  headRadiusCell: 0.23,
  headTipCell: 0.18,
  headShoulderCell: 0.17,
  tailTipCell: 0.2,
  tailShoulderCell: 0.13,
  turnDampingMin: 0.68,
  turnDensityScale: 1.6,
  directionSampleMinCells: 0.75,
  directionSampleMaxCells: 1.65,
  cornerSampleCells: 0.42,
  cornerInfluenceCells: 0.9,
  waveLengthStraightCells: 2.45,
  waveLengthCornerCells: 2.1,
  waveCycleMin: 1,
  waveCycleMax: 4.35,
  phaseSpeed: 2.15,
  cornerHarmonicStrength: 0.12,
  slitherOnsetStartCells: 1.4,
  slitherOnsetCellsPerSec: 22,
  slitherOnsetBlendCells: 2,
  baseAmplitudeCell: 0.34,
  cornerAmplitudeBoost: 1.22,
  longBodyDampingMin: 0.9,
  longBodyDampingStartCells: 10,
  longBodyDampingRangeCells: 14,
  anticipationMs: 110,
  anticipationCells: 0.12,
  trailCount: 0,
  trailPhaseCells: 0.55,
  trailAlpha: 0.13,
  trailStrokeRadius: 0.5,
  clearBurstMs: 320,
  clearBurstParticles: 5,
  clearBurstRadiusCells: 0.5,
} as const;

// ── Theme palette ──────────────────────────────────────────────────────────────
export const THEME = {
  bg: 0x1c0a03,
  bgDeep: 0x0a0200,
  panel: 0x2d0f04,
  panelDark: 0x130502,
  gold: 0xc8960c,
  goldSoft: 0x7a4a0d,
  goldDim: 0x4b2a07,
  goldFaint: 0x2f1704,
  cream: 0xfff3b0,
  danger: 0xff3822,
  hint: 0xfff4a8,
  dot: 0x323038,
} as const;
