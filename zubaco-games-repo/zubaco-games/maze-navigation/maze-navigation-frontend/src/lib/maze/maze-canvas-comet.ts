import type { MazeStagePixiPalette } from "@/theme/maze-stage-palette";
import * as PIXI from "pixi.js";

export const COMET_TRAIL_MAX_AGE_MS = 420;
export const COMET_MIN_SAMPLE_DIST_PX = 0.85;
const COMET_MAX_SAMPLES = 56;
const COMET_GLOW_WIDTH_TAIL = 6;
const COMET_GLOW_WIDTH_HEAD = 28;
const COMET_CORE_WIDTH_TAIL = 2.4;
const COMET_CORE_WIDTH_HEAD = 20;

export interface CometSample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}

export function appendCometSample(
  samples: CometSample[],
  player: PIXI.Container,
  now: number,
  minDistSq: number,
): void {
  const last = samples.at(-1);
  if (last) {
    const dx = player.x - last.x;
    const dy = player.y - last.y;
    if (dx * dx + dy * dy >= minDistSq) {
      samples.push({ x: player.x, y: player.y, t: now });
    }
  } else {
    samples.push({ x: player.x, y: player.y, t: now });
  }
  while (samples.length > COMET_MAX_SAMPLES) {
    samples.shift();
  }
}

export function pruneExpiredCometSamples(
  samples: CometSample[],
  now: number,
): void {
  while (samples.length > 0 && now - samples[0].t > COMET_TRAIL_MAX_AGE_MS) {
    samples.shift();
  }
}

export function drawCometTrailGraphics(
  trail: PIXI.Graphics,
  samples: CometSample[],
  now: number,
  palette: MazeStagePixiPalette,
): void {
  if (samples.length < 2) {
    return;
  }

  const fadeSample = (index: number): number => {
    const s = samples[index];
    if (!s) {
      return 0;
    }
    return Math.max(0, Math.min(1, 1 - (now - s.t) / COMET_TRAIL_MAX_AGE_MS));
  };

  const segmentCount = samples.length - 1;
  for (let i = 0; i < segmentCount; i += 1) {
    const p0 = samples[i];
    const p1 = samples[i + 1];
    if (!p0 || !p1) {
      continue;
    }
    const f = (fadeSample(i) + fadeSample(i + 1)) / 2;
    const headness = (i + 0.5) / segmentCount;
    const glowW =
      COMET_GLOW_WIDTH_TAIL +
      (COMET_GLOW_WIDTH_HEAD - COMET_GLOW_WIDTH_TAIL) * headness;
    const coreW =
      COMET_CORE_WIDTH_TAIL +
      (COMET_CORE_WIDTH_HEAD - COMET_CORE_WIDTH_TAIL) * headness;
    const glowAlpha = 0.14 * f;
    if (glowAlpha > 0.018) {
      trail.lineStyle(glowW, palette.trail, glowAlpha);
      trail.moveTo(p0.x, p0.y);
      trail.lineTo(p1.x, p1.y);
    }
    const coreAlpha = 0.52 * f;
    if (coreAlpha > 0.028) {
      trail.lineStyle(coreW, palette.playerCore, coreAlpha);
      trail.moveTo(p0.x, p0.y);
      trail.lineTo(p1.x, p1.y);
    }
  }
}
