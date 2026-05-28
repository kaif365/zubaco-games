import { APP_COLOR, PIXI_COLOR } from "@/theme/color";

export interface MazeStagePixiPalette {
  readonly floor: number;
  readonly floorAlt: number;
  readonly wallTop: number;
  readonly wallSide: number;
  readonly wallSideDark: number;
  readonly wallShadow: number;
  readonly wallShadowAlpha: number;
  readonly wallHighlight: number;
  readonly playerBase: number;
  readonly playerCore: number;
  readonly playerSpecular: number;
  readonly beaconOuter: number;
  readonly beaconInner: number;
  readonly trail: number;
}

const toPixiHex = (hex: string): number =>
  Number.parseInt(hex.replace("#", ""), 16);

function parseHex(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
  };
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (channel: number) =>
    Math.max(0, Math.min(255, Math.round(channel)));
  return `#${[r, g, b]
    .map((channel) => clamp(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixHex(a: string, b: string, ratio: number): string {
  const from = parseHex(a);
  const to = parseHex(b);
  const t = Math.max(0, Math.min(1, ratio));
  return toHex(
    from.r + (to.r - from.r) * t,
    from.g + (to.g - from.g) * t,
    from.b + (to.b - from.b) * t,
  );
}

function darkenHex(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex);
  const factor = 1 - Math.max(0, Math.min(1, amount));
  return toHex(r * factor, g * factor, b * factor);
}

function lightenHex(hex: string, amount: number): string {
  return mixHex(hex, "#ffffff", amount);
}

/** Fixed maze canvas palette (neon cyan walls on deep purple floor). */
export const MAZE_PIXI_PALETTE: MazeStagePixiPalette = {
  floor: PIXI_COLOR.floor,
  floorAlt: toPixiHex(mixHex(APP_COLOR.background, APP_COLOR.panel, 0.22)),
  wallTop: toPixiHex(darkenHex(APP_COLOR.accent, 0.15)),
  wallSide: toPixiHex(darkenHex(APP_COLOR.accent, 0.35)),
  wallSideDark: toPixiHex(darkenHex(APP_COLOR.action, 0.22)),
  wallShadow: 0x000000,
  wallShadowAlpha: 0.4,
  wallHighlight: toPixiHex(lightenHex(APP_COLOR.accent, 0.25)),
  playerBase: PIXI_COLOR.playerBase,
  playerCore: PIXI_COLOR.playerCore,
  playerSpecular: PIXI_COLOR.playerSpecular,
  beaconOuter: PIXI_COLOR.beaconOuter,
  beaconInner: PIXI_COLOR.beaconInner,
  trail: PIXI_COLOR.trail,
};

export function getMazePixiPalette(): MazeStagePixiPalette {
  return MAZE_PIXI_PALETTE;
}
