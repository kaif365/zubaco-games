import { mulberry32 } from './random';

type BallColor = string;

interface Tube {
  id: number;
  balls: BallColor[];
  capacity: number;
}

interface StageConfig {
  colorCount: number;
  ballsPerTube: number;
  emptyTubes: number;
}

const ALL_COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan', 'lime'];

export function generatePuzzle(seed: number, config: StageConfig): Tube[] {
  const rng = mulberry32(seed);
  const colors = ALL_COLORS.slice(0, config.colorCount);
  const { ballsPerTube, emptyTubes } = config;

  // Start from the SOLVED state: one full uniform tube per colour + empty tubes.
  const tubes: Tube[] = [];
  for (let i = 0; i < config.colorCount; i++) {
    const color = colors[i];
    tubes.push({ id: i, balls: Array.from({ length: ballsPerTube }, () => color), capacity: ballsPerTube });
  }
  for (let i = 0; i < emptyTubes; i++) {
    tubes.push({ id: config.colorCount + i, balls: [], capacity: ballsPerTube });
  }

  // Scramble by applying random VALID forward moves. Every resulting state is
  // therefore reachable from solved and is guaranteed solvable (reverse path).
  let state = tubes;
  const scrambleMoves = config.colorCount * ballsPerTube * 12;
  for (let s = 0; s < scrambleMoves; s++) {
    const valid: [number, number][] = [];
    for (let from = 0; from < state.length; from++) {
      for (let to = 0; to < state.length; to++) {
        if (isValidMove(state, from, to)) valid.push([from, to]);
      }
    }
    if (valid.length === 0) break;
    const [from, to] = valid[Math.floor(rng() * valid.length)];
    state = executeMove(state, from, to);
  }

  // Reject an already-solved scramble so play is never trivial.
  if (isPuzzleSolved(state)) {
    return generatePuzzle((seed + 1) & 0x7fffffff, config);
  }
  return state;
}

export function isValidMove(tubes: Tube[], fromIdx: number, toIdx: number): boolean {
  const from = tubes[fromIdx];
  const to = tubes[toIdx];
  if (!from || !to) return false;
  if (from.balls.length === 0) return false;
  if (to.balls.length >= to.capacity) return false;
  if (fromIdx === toIdx) return false;
  if (to.balls.length === 0) return true;
  return from.balls[from.balls.length - 1] === to.balls[to.balls.length - 1];
}

export function executeMove(tubes: Tube[], fromIdx: number, toIdx: number): Tube[] {
  if (!isValidMove(tubes, fromIdx, toIdx)) return tubes;
  return tubes.map((tube, idx) => {
    if (idx === fromIdx) return { ...tube, balls: tube.balls.slice(0, -1) };
    if (idx === toIdx) {
      const ball = tubes[fromIdx].balls[tubes[fromIdx].balls.length - 1];
      return { ...tube, balls: [...tube.balls, ball] };
    }
    return tube;
  });
}

export function isTubeSorted(tube: Tube): boolean {
  if (tube.balls.length === 0) return true;
  if (tube.balls.length !== tube.capacity) return false;
  return tube.balls.every((b) => b === tube.balls[0]);
}

export function isPuzzleSolved(tubes: Tube[]): boolean {
  return tubes.every(isTubeSorted);
}
