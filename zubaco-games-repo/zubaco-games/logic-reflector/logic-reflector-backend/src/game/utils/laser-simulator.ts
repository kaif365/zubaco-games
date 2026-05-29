/**
 * Pure TypeScript laser simulation engine for Logic Reflector.
 *
 * Simulates laser beams emitted from emitter cells and checks if all
 * receiver cells are hit — determining if the puzzle is solved.
 *
 * Cell types (match CELL_TYPE in constants.ts):
 *   1 = emitter (laser source)
 *   2 = target/receiver
 *   3 = blocker/wall (blocks laser)
 *
 * Block types (match BLOCK_TYPE in constants.ts):
 *   1 = reflect-block  (retroreflector — reverses direction 180°)
 *   2 = mirror-fwd     (/ mirror: up↔right, down↔left)
 *   3 = mirror-bwd     (\ mirror: up↔left, down↔right)
 *   4 = splitter       (splits into two beams perpendicular to travel)
 *   5 = blocker        (absorbs/blocks the laser)
 *
 * Direction encoding:
 *   0 = up    (row--)
 *   1 = down  (row++)
 *   2 = left  (col--)
 *   3 = right (col++)
 */

export interface SimCell {
  row: number;
  col: number;
  cellType: number;
  orientation: number; // emitter direction when cellType === 1
}

export interface SimBlock {
  row: number;
  col: number;
  blockType: number;
  orientation: number;
}

// Direction constants
const UP = 0;
const DOWN = 1;
const LEFT = 2;
const RIGHT = 3;

// Block type constants (match BLOCK_TYPE in constants.ts)
const REFLECT_BLOCK = 1;
const MIRROR_FWD = 2; // / mirror
const MIRROR_BWD = 3; // \ mirror
const SPLITTER = 4;
const BLOCKER = 5;

// Cell type constants (match CELL_TYPE in constants.ts)
const CELL_EMITTER = 1;
const CELL_RECEIVER = 2; // = TARGET
const CELL_WALL = 3; // = BLOCKER cell

interface LaserRay {
  row: number;
  col: number;
  direction: number;
}

const DELTAS: Record<number, { dr: number; dc: number }> = {
  [UP]: { dr: -1, dc: 0 },
  [DOWN]: { dr: 1, dc: 0 },
  [LEFT]: { dr: 0, dc: -1 },
  [RIGHT]: { dr: 0, dc: 1 },
};

/**
 * Reverse direction 180° (retroreflector).
 *
 * @param {number} dir - incoming direction.
 * @returns {number} reversed direction.
 */
function reverseDir(dir: number): number {
  switch (dir) {
    case UP:
      return DOWN;
    case DOWN:
      return UP;
    case LEFT:
      return RIGHT;
    case RIGHT:
      return LEFT;
    default:
      return dir;
  }
}

/**
 * Reflect direction off a forward mirror (/ mirror).
 * Maps: up→right, right→up, down→left, left→down
 *
 * @param {number} dir - incoming direction.
 * @returns {number} reflected direction.
 */
function reflectFwd(dir: number): number {
  switch (dir) {
    case UP:
      return RIGHT;
    case RIGHT:
      return UP;
    case DOWN:
      return LEFT;
    case LEFT:
      return DOWN;
    default:
      return dir;
  }
}

/**
 * Reflect direction off a backward mirror (\ mirror).
 * Maps: up→left, left→up, down→right, right→down
 *
 * @param {number} dir - incoming direction.
 * @returns {number} reflected direction.
 */
function reflectBwd(dir: number): number {
  switch (dir) {
    case UP:
      return LEFT;
    case LEFT:
      return UP;
    case DOWN:
      return RIGHT;
    case RIGHT:
      return DOWN;
    default:
      return dir;
  }
}

/**
 * Get perpendicular directions for a splitter.
 *
 * @param {number} dir - incoming direction.
 * @returns {number[]} the two perpendicular directions.
 */
function splitterDirections(dir: number): number[] {
  if (dir === UP || dir === DOWN) {
    return [LEFT, RIGHT];
  }
  return [UP, DOWN];
}

/**
 * Simulate all laser beams on a board and return the set of receiver cells that are hit.
 *
 * @param {number} gridRows - number of grid rows.
 * @param {number} gridCols - number of grid columns.
 * @param {SimCell[]} cells - board cells (emitters, receivers, walls).
 * @param {SimBlock[]} blocks - placed blocks (mirrors, splitters, blockers).
 *
 * @returns {{ hitReceivers: Set<string>; totalReceivers: number }} simulation result.
 */
export function simulateLasers(
  gridRows: number,
  gridCols: number,
  cells: SimCell[],
  blocks: SimBlock[],
): { hitReceivers: Set<string>; totalReceivers: number } {
  // Build lookup maps
  const blockMap = new Map<string, SimBlock>();
  for (const block of blocks) {
    blockMap.set(`${block.row},${block.col}`, block);
  }

  const cellMap = new Map<string, SimCell>();
  for (const cell of cells) {
    cellMap.set(`${cell.row},${cell.col}`, cell);
  }

  const receivers = cells.filter((c) => c.cellType === CELL_RECEIVER);
  const emitters = cells.filter((c) => c.cellType === CELL_EMITTER);
  const hitReceivers = new Set<string>();

  // BFS/queue-based ray tracing to avoid deep recursion
  const queue: LaserRay[] = [];
  const visited = new Set<string>(); // "row,col,dir" to prevent infinite loops

  // Seed rays from all emitters
  for (const emitter of emitters) {
    const startDir = emitter.orientation; // emitter fires in its orientation direction
    queue.push({ row: emitter.row, col: emitter.col, direction: startDir });
  }

  while (queue.length > 0) {
    const ray = queue.shift()!;
    const visitKey = `${ray.row},${ray.col},${ray.direction}`;
    if (visited.has(visitKey)) {
      continue;
    }
    visited.add(visitKey);

    const delta = DELTAS[ray.direction];
    if (!delta) {
      continue;
    }

    let r = ray.row + delta.dr;
    let c = ray.col + delta.dc;

    while (r >= 0 && r < gridRows && c >= 0 && c < gridCols) {
      const posKey = `${r},${c}`;

      // Check for a block at this position first
      const block = blockMap.get(posKey);
      if (block) {
        if (block.blockType === BLOCKER) {
          // Laser absorbed — stop
          break;
        } else if (block.blockType === REFLECT_BLOCK) {
          const newDir = reverseDir(ray.direction);
          queue.push({ row: r, col: c, direction: newDir });
          break;
        } else if (block.blockType === MIRROR_FWD) {
          const newDir = reflectFwd(ray.direction);
          queue.push({ row: r, col: c, direction: newDir });
          break;
        } else if (block.blockType === MIRROR_BWD) {
          const newDir = reflectBwd(ray.direction);
          queue.push({ row: r, col: c, direction: newDir });
          break;
        } else if (block.blockType === SPLITTER) {
          const dirs = splitterDirections(ray.direction);
          for (const dir of dirs) {
            queue.push({ row: r, col: c, direction: dir });
          }
          break;
        }
      }

      // Check for a cell at this position
      const cell = cellMap.get(posKey);
      if (cell) {
        if (cell.cellType === CELL_WALL) {
          // Wall blocks laser
          break;
        } else if (cell.cellType === CELL_RECEIVER) {
          hitReceivers.add(posKey);
          // Laser continues through receiver (or stops — configurable)
          // For Logic Reflector, laser stops at receiver
          break;
        } else if (cell.cellType === CELL_EMITTER) {
          // Another emitter — laser passes through or stops
          // Treat emitters as walls for incoming beams
          break;
        }
        // CELL_EMPTY — continue
      }

      r += delta.dr;
      c += delta.dc;
    }
  }

  return { hitReceivers, totalReceivers: receivers.length };
}

/**
 * Determine if the puzzle is solved: every receiver cell is hit by at least one laser.
 *
 * @param {number} gridRows - number of grid rows.
 * @param {number} gridCols - number of grid columns.
 * @param {SimCell[]} cells - board cells.
 * @param {SimBlock[]} blocks - placed blocks.
 *
 * @returns {boolean} true if all receivers are hit.
 */
export function isSolved(
  gridRows: number,
  gridCols: number,
  cells: SimCell[],
  blocks: SimBlock[],
): boolean {
  const { hitReceivers, totalReceivers } = simulateLasers(
    gridRows,
    gridCols,
    cells,
    blocks,
  );
  if (totalReceivers === 0) {
    return false;
  }
  return hitReceivers.size === totalReceivers;
}
