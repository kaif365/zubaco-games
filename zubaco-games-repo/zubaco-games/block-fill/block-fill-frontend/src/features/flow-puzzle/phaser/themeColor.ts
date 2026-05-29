import * as Phaser from 'phaser';

/**
 * Board chrome: deep purple–midnight neutrals aligned with Zubaco dark palette.
 * Path and endpoint colors stay per-level; only the grid uses this system.
 */
export const BOARD_DESIGN_SYSTEM = {
  /** `#0f0a1e` — deep purple-black background */
  baseFill: 0x0f0a1e,
  /** Blocked / disabled cells — lifted indigo charcoal */
  blockedCellFill: 0x1a1233,
  /** Grid strokes — cool cyan at low alpha */
  gridLine: { color: 0x00f0ff as number, alpha: 0.1 },
  /** Playable cells — dark panel tone */
  cellEnabledFill: { color: 0x161030 as number, alpha: 1.0 },
  /** Blocked tile veil */
  cellBlockedTint: { color: 0x8b5cf6 as number, alpha: 0.06 },
  /** Dim overlay when board is disabled */
  overlayFill: { color: 0x0a0618 as number, alpha: 0.6 },
} as const;

/**
 * Parses hex (`#rrggbb`) or `rgb` / `rgba` strings into Phaser ARGB integer + alpha.
 *
 * @param input CSS color string
 */
export function cssColorToPhaser(input: string): { color: number; alpha: number } {
  const s = input.trim();
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/i.exec(s);
  if (rgba) {
    const r = Number(rgba[1]);
    const g = Number(rgba[2]);
    const b = Number(rgba[3]);
    const a = rgba[4] !== undefined ? Number(rgba[4]) : 1;
    return { color: Phaser.Display.Color.GetColor(r, g, b), alpha: Number.isFinite(a) ? a : 1 };
  }
  let hex = s;
  if (!hex.startsWith('#')) hex = `#${hex}`;
  const parsed = Phaser.Display.Color.HexStringToColor(hex);
  return { color: parsed.color, alpha: 1 };
}

/**
 * Multiplies RGB components (keeps hue, darkens).
 *
 * @param color Phaser RGB integer
 * @param factor 0–1 multiplier per channel
 */
export function scaleRgb(color: number, factor: number): number {
  const r = ((color >> 16) & 0xff) * factor;
  const g = ((color >> 8) & 0xff) * factor;
  const b = (color & 0xff) * factor;
  return Phaser.Display.Color.GetColor(
    Math.min(255, Math.round(r)),
    Math.min(255, Math.round(g)),
    Math.min(255, Math.round(b)),
  );
}
