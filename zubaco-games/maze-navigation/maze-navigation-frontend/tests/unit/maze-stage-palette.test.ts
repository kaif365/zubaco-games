import { PIXI_COLOR } from "@/theme/color";
import {
  getMazePixiPalette,
  MAZE_PIXI_PALETTE,
} from "@/theme/maze-stage-palette";
import { describe, expect, it } from "vitest";

function relativeLuminance(hex: number): number {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

describe("getMazePixiPalette", () => {
  it("returns fixed legacy PIXI_COLOR-based palette", () => {
    const palette = getMazePixiPalette();
    expect(palette).toBe(MAZE_PIXI_PALETTE);
    expect(palette.floor).toBe(PIXI_COLOR.floor);
    expect(palette.playerBase).toBe(PIXI_COLOR.playerBase);
    expect(palette.beaconOuter).toBe(PIXI_COLOR.beaconOuter);
  });

  it("uses darker wall faces than legacy PIXI_COLOR.wall", () => {
    const palette = getMazePixiPalette();
    expect(relativeLuminance(palette.wallTop)).toBeLessThan(
      relativeLuminance(PIXI_COLOR.wall),
    );
    expect(relativeLuminance(palette.wallSide)).toBeLessThan(
      relativeLuminance(palette.wallTop),
    );
  });

  it("has checker floor contrast", () => {
    const palette = getMazePixiPalette();
    expect(palette.floorAlt).not.toBe(palette.floor);
  });

  it("has valid wall depth colors", () => {
    const palette = getMazePixiPalette();
    expect(palette.wallSide).not.toBe(palette.wallTop);
    expect(palette.wallShadowAlpha).toBeGreaterThan(0.28);
    expect(palette.wallShadowAlpha).toBeLessThanOrEqual(1);
  });
});
