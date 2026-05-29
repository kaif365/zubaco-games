import { computeFinalSeed } from './random';

/**
 * Server-side circle sequence regenerator.
 * Mirrors the frontend circleGenerator.ts exactly to verify tap correctness.
 */

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface GeneratedCircle {
  id: number;
  color: 'green' | 'red' | 'blue' | 'yellow';
}

/**
 * Regenerate the circle sequence from the seed.
 * Returns all circles that would have been generated during the game.
 * We generate up to maxCircles (enough to cover the full game duration).
 */
export function regenerateCircleSequence(seed: number, maxCircles: number): GeneratedCircle[] {
  const rng = mulberry32(seed);
  const circles: GeneratedCircle[] = [];

  for (let i = 0; i < maxCircles; i++) {
    // x and y are consumed but not needed for validation
    rng(); // x
    rng(); // y
    const colorRoll = rng();
    const color: GeneratedCircle['color'] = colorRoll < 0.4 ? 'green' : colorRoll < 0.6 ? 'red' : colorRoll < 0.8 ? 'blue' : 'yellow';
    circles.push({ id: i, color });
  }

  return circles;
}

/**
 * Validate submitted taps against the regenerated circle sequence.
 * Returns the true count of correct (green) taps and wrong (non-green) taps.
 */
export function validateTaps(
  seed: number,
  taps: { circleId: number; timestamp: number; correct: boolean }[],
  maxCircles: number,
): { correctTaps: number; wrongTaps: number } {
  const circles = regenerateCircleSequence(seed, maxCircles);
  let correctTaps = 0;
  let wrongTaps = 0;

  for (const tap of taps) {
    const circle = circles.find(c => c.id === tap.circleId);
    if (!circle) {
      // Tapped a circle that doesn't exist in the sequence
      wrongTaps++;
      continue;
    }
    if (circle.color === 'green') {
      correctTaps++;
    } else {
      wrongTaps++;
    }
  }

  return { correctTaps, wrongTaps };
}

export { computeFinalSeed };
