import type { BlockType, Direction, GameLevel, PlacedBlock, ServerCell } from '@/types/logic-reflector';

export interface BeamPoint {
  x: number;
  y: number;
}

export interface BeamArm {
  points: BeamPoint[];
  exitedGrid: boolean;
}

export interface LaserResult {
  arms: BeamArm[];
  litTargetKeys: Set<string>;
}

interface Ray {
  origin: BeamPoint;
  dir: BeamPoint;
}

interface Obstacle {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  reflective: boolean;
}

interface Target {
  key: string;
  x: number;
  y: number;
  radius: number;
}

interface RectHit {
  t: number;
  normal: BeamPoint;
  point: BeamPoint;
  obstacle: Obstacle;
}

const EPSILON = 0.0001;
const MAX_BOUNCES = 48;
const DEFAULT_BLOCK_INSET = 0.08;
const DEFAULT_TARGET_RADIUS = 0.14;
const EXIT_REACH_CELLS = 24;

function normalize(v: BeamPoint): BeamPoint {
  const len = Math.hypot(v.x, v.y);
  if (len < EPSILON) return { x: 1, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function dot(a: BeamPoint, b: BeamPoint): number {
  return a.x * b.x + a.y * b.y;
}

function reflect(dir: BeamPoint, normal: BeamPoint): BeamPoint {
  const n = normalize(normal);
  const d = dot(dir, n);
  return normalize({
    x: dir.x - 2 * d * n.x,
    y: dir.y - 2 * d * n.y,
  });
}

function add(a: BeamPoint, b: BeamPoint): BeamPoint {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scale(v: BeamPoint, amount: number): BeamPoint {
  return { x: v.x * amount, y: v.y * amount };
}

export function pointForCell(cell: ServerCell | PlacedBlock): BeamPoint {
  if ('x' in cell && typeof cell.x === 'number' && typeof cell.y === 'number') {
    return { x: cell.x, y: cell.y };
  }
  return { x: cell.col + 0.5, y: cell.row + 0.5 };
}

export function targetKey(cell: ServerCell, index = 0): string {
  if (cell.id) return cell.id;
  if (typeof cell.x === 'number' && typeof cell.y === 'number') {
    return `target:${index}:${cell.x.toFixed(3)},${cell.y.toFixed(3)}`;
  }
  return `${cell.row},${cell.col}`;
}

export function directionToVector(direction?: Direction, angle?: number): BeamPoint {
  if (typeof angle === 'number' && Number.isFinite(angle)) {
    const radians = (angle * Math.PI) / 180;
    return normalize({ x: Math.cos(radians), y: Math.sin(radians) });
  }

  switch (direction) {
    case 'N': return { x: 0, y: -1 };
    case 'S': return { x: 0, y: 1 };
    case 'E': return { x: 1, y: 0 };
    case 'W': return { x: -1, y: 0 };
    case 'NE': return normalize({ x: 1, y: -1 });
    case 'NW': return normalize({ x: -1, y: -1 });
    case 'SE': return normalize({ x: 1, y: 1 });
    case 'SW': return normalize({ x: -1, y: 1 });
    default: return { x: 1, y: 0 };
  }
}

export function angleForDirection(direction?: Direction, angle?: number): number {
  if (typeof angle === 'number' && Number.isFinite(angle)) return angle;
  switch (direction) {
    case 'N': return -90;
    case 'S': return 90;
    case 'E': return 0;
    case 'W': return 180;
    case 'NE': return -45;
    case 'NW': return -135;
    case 'SE': return 45;
    case 'SW': return 135;
    default: return 90;
  }
}

function blockBounds(row: number, col: number, size?: number) {
  const actualSize = Math.max(0.2, Math.min(1, size ?? 1 - DEFAULT_BLOCK_INSET * 2));
  const inset = (1 - actualSize) / 2;
  return {
    x: col + inset,
    y: row + inset,
    w: actualSize,
    h: actualSize,
  };
}

function isReflectiveBlock(type: ServerCell['type'] | BlockType): boolean {
  return (
    type === 'reflect-block' ||
    type === 'mirror-fwd' ||
    type === 'mirror-bwd' ||
    type === 'splitter'
  );
}

function levelObstacles(level: GameLevel, placedBlocks: PlacedBlock[]): Obstacle[] {
  const fixedObstacles = level.cells
    .filter((cell) => isReflectiveBlock(cell.type) || cell.type === 'blocker')
    .map((cell, index): Obstacle => {
      const bounds = blockBounds(cell.row, cell.col, cell.size);
      return {
        key: cell.id ?? `fixed:${index}:${cell.row},${cell.col}`,
        ...bounds,
        reflective: isReflectiveBlock(cell.type),
      };
    });

  const placedObstacles = placedBlocks.map((block, index): Obstacle => {
    const bounds = blockBounds(block.row, block.col);
    return {
      key: `placed:${index}:${block.row},${block.col}`,
      ...bounds,
      reflective: isReflectiveBlock(block.type),
    };
  });

  return [...fixedObstacles, ...placedObstacles];
}

function levelTargets(level: GameLevel): Target[] {
  return level.cells
    .filter((cell) => cell.type === 'target')
    .map((cell, index) => {
      const point = pointForCell(cell);
      return {
        key: targetKey(cell, index),
        x: point.x,
        y: point.y,
        radius: cell.radius ?? DEFAULT_TARGET_RADIUS,
      };
    });
}

function hitVerticalSide(ray: Ray, x: number, y1: number, y2: number, normal: BeamPoint): RectHitCandidate | null {
  if (Math.abs(ray.dir.x) < EPSILON) return null;
  const t = (x - ray.origin.x) / ray.dir.x;
  if (t <= EPSILON) return null;
  const y = ray.origin.y + ray.dir.y * t;
  if (y < y1 - EPSILON || y > y2 + EPSILON) return null;
  return { t, normal };
}

function hitHorizontalSide(ray: Ray, y: number, x1: number, x2: number, normal: BeamPoint): RectHitCandidate | null {
  if (Math.abs(ray.dir.y) < EPSILON) return null;
  const t = (y - ray.origin.y) / ray.dir.y;
  if (t <= EPSILON) return null;
  const x = ray.origin.x + ray.dir.x * t;
  if (x < x1 - EPSILON || x > x2 + EPSILON) return null;
  return { t, normal };
}

interface RectHitCandidate {
  t: number;
  normal: BeamPoint;
}

function hitObstacle(ray: Ray, obstacle: Obstacle): RectHit | null {
  const candidates = [
    hitVerticalSide(ray, obstacle.x, obstacle.y, obstacle.y + obstacle.h, { x: -1, y: 0 }),
    hitVerticalSide(ray, obstacle.x + obstacle.w, obstacle.y, obstacle.y + obstacle.h, { x: 1, y: 0 }),
    hitHorizontalSide(ray, obstacle.y, obstacle.x, obstacle.x + obstacle.w, { x: 0, y: -1 }),
    hitHorizontalSide(ray, obstacle.y + obstacle.h, obstacle.x, obstacle.x + obstacle.w, { x: 0, y: 1 }),
  ].filter((candidate): candidate is RectHitCandidate => candidate !== null);

  if (candidates.length === 0) return null;

  const minT = Math.min(...candidates.map((candidate) => candidate.t));
  const normals = candidates
    .filter((candidate) => Math.abs(candidate.t - minT) < EPSILON)
    .reduce(
      (sum, candidate) => ({ x: sum.x + candidate.normal.x, y: sum.y + candidate.normal.y }),
      { x: 0, y: 0 },
    );

  const point = add(ray.origin, scale(ray.dir, minT));
  return {
    t: minT,
    normal: normalize(normals),
    point,
    obstacle,
  };
}

function nearestObstacleHit(ray: Ray, obstacles: Obstacle[]): RectHit | null {
  let nearest: RectHit | null = null;
  for (const obstacle of obstacles) {
    const hit = hitObstacle(ray, obstacle);
    if (!hit) continue;
    if (!nearest || hit.t < nearest.t) nearest = hit;
  }
  return nearest;
}

function boardExitT(ray: Ray, rows: number, cols: number): number {
  const candidates: number[] = [];

  if (ray.dir.x > EPSILON) candidates.push((cols - ray.origin.x) / ray.dir.x);
  if (ray.dir.x < -EPSILON) candidates.push((0 - ray.origin.x) / ray.dir.x);
  if (ray.dir.y > EPSILON) candidates.push((rows - ray.origin.y) / ray.dir.y);
  if (ray.dir.y < -EPSILON) candidates.push((0 - ray.origin.y) / ray.dir.y);

  const positive = candidates.filter((t) => t > EPSILON);
  return positive.length > 0 ? Math.min(...positive) : 0;
}

function rayCircleT(ray: Ray, target: Target): number | null {
  const oc = { x: ray.origin.x - target.x, y: ray.origin.y - target.y };
  const b = 2 * dot(oc, ray.dir);
  const c = dot(oc, oc) - target.radius * target.radius;
  const discriminant = b * b - 4 * c;
  if (discriminant < 0) return null;

  const root = Math.sqrt(discriminant);
  const t1 = (-b - root) / 2;
  const t2 = (-b + root) / 2;
  const t = [t1, t2].find((candidate) => candidate > EPSILON);
  return t ?? null;
}

function markTargetsOnSegment(ray: Ray, targets: Target[], maxT: number, litTargetKeys: Set<string>) {
  for (const target of targets) {
    const hitT = rayCircleT(ray, target);
    if (hitT !== null && hitT <= maxT + EPSILON) {
      litTargetKeys.add(target.key);
    }
  }
}

function simulateEmitter(
  emitter: ServerCell,
  level: GameLevel,
  obstacles: Obstacle[],
  targets: Target[],
  litTargetKeys: Set<string>,
): BeamArm {
  let ray: Ray = {
    origin: pointForCell(emitter),
    dir: directionToVector(emitter.direction, emitter.angle),
  };

  const points: BeamPoint[] = [ray.origin];
  let exitedGrid = false;

  for (let bounce = 0; bounce <= MAX_BOUNCES; bounce++) {
    const exitT = boardExitT(ray, level.gridSize.y, level.gridSize.x);
    const obstacleHit = nearestObstacleHit(ray, obstacles);
    const obstacleT = obstacleHit ? obstacleHit.t : Number.POSITIVE_INFINITY;
    const segmentT = Math.min(exitT, obstacleT);

    markTargetsOnSegment(ray, targets, segmentT, litTargetKeys);

    if (!obstacleHit || exitT < obstacleHit.t) {
      const exitPoint = add(ray.origin, scale(ray.dir, exitT + EXIT_REACH_CELLS));
      points.push(exitPoint);
      exitedGrid = true;
      break;
    }

    points.push(obstacleHit.point);

    if (!obstacleHit.obstacle.reflective) break;

    const nextDir = reflect(ray.dir, obstacleHit.normal);
    ray = {
      origin: add(obstacleHit.point, scale(nextDir, EPSILON * 4)),
      dir: nextDir,
    };

    const previousPoint = points[points.length - 2];
    if (
      previousPoint &&
      Math.hypot(previousPoint.x - obstacleHit.point.x, previousPoint.y - obstacleHit.point.y) < EPSILON
    ) {
      break;
    }
  }

  return { points, exitedGrid };
}

export function simulateLaser(level: GameLevel, placedBlocks: PlacedBlock[]): LaserResult {
  const litTargetKeys = new Set<string>();
  const obstacles = levelObstacles(level, placedBlocks);
  const targets = levelTargets(level);
  const emitters = level.cells.filter((cell) => cell.type === 'emitter');

  const arms = emitters.map((emitter) =>
    simulateEmitter(emitter, level, obstacles, targets, litTargetKeys),
  );

  return { arms, litTargetKeys };
}
