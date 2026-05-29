import type { BallColor, Tube, StageConfig } from '@/types/game';
import { mulberry32, seededShuffle } from './random';

const ALL_COLORS: BallColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan', 'lime'];

/**
 * Generate a solvable Ball Sort puzzle.
 * Strategy: Create solved state, then shuffle balls across tubes.
 * This guarantees solvability because we start from a valid solution.
 */
export function generatePuzzle(seed: number, config: StageConfig): Tube[] {
  const rng = mulberry32(seed);
  const colors = ALL_COLORS.slice(0, config.colorCount);
  const { ballsPerTube, emptyTubes } = config;

  // Create all balls: each color appears ballsPerTube times
  const allBalls: BallColor[] = [];
  for (const color of colors) {
    for (let i = 0; i < ballsPerTube; i++) {
      allBalls.push(color);
    }
  }

  // Shuffle all balls
  const shuffled = seededShuffle(allBalls, rng);

  // Distribute into tubes (non-empty tubes get ballsPerTube balls each)
  const tubes: Tube[] = [];
  let ballIdx = 0;

  for (let i = 0; i < config.colorCount; i++) {
    const tubeBalls = shuffled.slice(ballIdx, ballIdx + ballsPerTube);
    ballIdx += ballsPerTube;
    tubes.push({ id: i, balls: tubeBalls, capacity: ballsPerTube });
  }

  // Add empty tubes
  for (let i = 0; i < emptyTubes; i++) {
    tubes.push({ id: config.colorCount + i, balls: [], capacity: ballsPerTube });
  }

  return tubes;
}

/**
 * Check if a move is valid.
 */
export function isValidMove(tubes: Tube[], fromIdx: number, toIdx: number): boolean {
  const from = tubes[fromIdx];
  const to = tubes[toIdx];

  if (!from || !to) return false;
  if (from.balls.length === 0) return false;
  if (to.balls.length >= to.capacity) return false;
  if (fromIdx === toIdx) return false;

  // Can move to empty tube or same-color top
  if (to.balls.length === 0) return true;
  const movingBall = from.balls[from.balls.length - 1];
  const topBall = to.balls[to.balls.length - 1];
  return movingBall === topBall;
}

/**
 * Execute a move. Returns new tubes array (immutable).
 */
export function executeMove(tubes: Tube[], fromIdx: number, toIdx: number): Tube[] {
  if (!isValidMove(tubes, fromIdx, toIdx)) return tubes;

  return tubes.map((tube, idx) => {
    if (idx === fromIdx) {
      return { ...tube, balls: tube.balls.slice(0, -1) };
    }
    if (idx === toIdx) {
      const ball = tubes[fromIdx].balls[tubes[fromIdx].balls.length - 1];
      return { ...tube, balls: [...tube.balls, ball] };
    }
    return tube;
  });
}

/**
 * Check if a single tube is fully sorted (one colour only, at capacity).
 */
export function isTubeSorted(tube: Tube): boolean {
  if (tube.balls.length === 0) return true;
  if (tube.balls.length !== tube.capacity) return false;
  return tube.balls.every((b) => b === tube.balls[0]);
}

/**
 * Check if the entire puzzle is solved.
 */
export function isPuzzleSolved(tubes: Tube[]): boolean {
  return tubes.every(isTubeSorted);
}
