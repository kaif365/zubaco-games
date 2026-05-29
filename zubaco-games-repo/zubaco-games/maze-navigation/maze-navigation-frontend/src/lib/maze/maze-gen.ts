import { Direction, type MazeCell } from "@/types/maze";

interface Neighbor {
  readonly cell: MazeCell;
  readonly direction: Direction;
}

export function generateMaze(cols: number, rows: number): MazeCell[][] {
  const grid: MazeCell[][] = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => ({
      x,
      y,
      walls: 0,
      visited: false,
    })),
  );

  const startCell = grid[0][0];
  const stack: MazeCell[] = [startCell];
  startCell.visited = true;

  while (stack.length > 0) {
    const currentCell = stack[stack.length - 1];
    const neighbors = getUnvisitedNeighbors(currentCell, grid, cols, rows);

    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }

    const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
    currentCell.walls |= neighbor.direction;
    neighbor.cell.walls |= getOppositeDirection(neighbor.direction);
    neighbor.cell.visited = true;
    stack.push(neighbor.cell);
  }

  return grid;
}

function getUnvisitedNeighbors(
  cell: MazeCell,
  grid: MazeCell[][],
  cols: number,
  rows: number,
): Neighbor[] {
  const neighbors: Neighbor[] = [];

  if (cell.y > 0 && !grid[cell.y - 1][cell.x].visited) {
    neighbors.push({ cell: grid[cell.y - 1][cell.x], direction: Direction.UP });
  }
  if (cell.y < rows - 1 && !grid[cell.y + 1][cell.x].visited) {
    neighbors.push({
      cell: grid[cell.y + 1][cell.x],
      direction: Direction.DOWN,
    });
  }
  if (cell.x > 0 && !grid[cell.y][cell.x - 1].visited) {
    neighbors.push({
      cell: grid[cell.y][cell.x - 1],
      direction: Direction.LEFT,
    });
  }
  if (cell.x < cols - 1 && !grid[cell.y][cell.x + 1].visited) {
    neighbors.push({
      cell: grid[cell.y][cell.x + 1],
      direction: Direction.RIGHT,
    });
  }

  return neighbors;
}

export function getOppositeDirection(direction: Direction): Direction {
  switch (direction) {
    case Direction.UP:
      return Direction.DOWN;
    case Direction.DOWN:
      return Direction.UP;
    case Direction.LEFT:
      return Direction.RIGHT;
    case Direction.RIGHT:
      return Direction.LEFT;
    default:
      return direction;
  }
}

export function getDirectionVector(direction: Direction): {
  dx: number;
  dy: number;
} {
  switch (direction) {
    case Direction.UP:
      return { dx: 0, dy: -1 };
    case Direction.DOWN:
      return { dx: 0, dy: 1 };
    case Direction.LEFT:
      return { dx: -1, dy: 0 };
    case Direction.RIGHT:
      return { dx: 1, dy: 0 };
    default:
      return { dx: 0, dy: 0 };
  }
}
