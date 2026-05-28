import { MAZE_CELL_SIZE } from "@/constants/maze";
import { getOppositeDirection } from "@/lib/maze/maze-gen";
import { Direction, type MazeCell } from "@/types/maze";

export function cellCenter(
  cellX: number,
  cellY: number,
): { x: number; y: number } {
  return {
    x: cellX * MAZE_CELL_SIZE + MAZE_CELL_SIZE / 2,
    y: cellY * MAZE_CELL_SIZE + MAZE_CELL_SIZE / 2,
  };
}

export function getCellExits(
  cell: MazeCell,
  incomingDirection: Direction,
): Direction[] {
  const oppositeDirection = getOppositeDirection(incomingDirection);
  return [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT].filter(
    (candidateDirection) =>
      cell.walls & candidateDirection &&
      candidateDirection !== oppositeDirection,
  );
}

export function isSteppingBackAlongTrail(
  trailPoints: Array<{ x: number; y: number }>,
  startCenterX: number,
  startCenterY: number,
  targetX: number,
  targetY: number,
): boolean {
  const trailEnd = trailPoints.at(-1);
  const trailPrior = trailPoints.at(-2);
  return (
    trailEnd?.x === startCenterX &&
    trailEnd?.y === startCenterY &&
    trailPrior?.x === targetX &&
    trailPrior?.y === targetY
  );
}
