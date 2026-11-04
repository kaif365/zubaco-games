import { generateMaze, computeShortestPath } from '../../utils/maze-generator';
import { validateMazeMove } from '../../utils/move-validator';

describe('Maze Navigation Mathematical Solvability & Collision Detection', () => {
  it('generates fully connected spanning tree maze with guaranteed solvable path to exit', () => {
    const rows = 15;
    const cols = 15;
    const seed = 'test-maze-seed-42';

    const maze = generateMaze(rows, cols, seed);

    expect(maze.length).toBe(rows);
    expect(maze[0].length).toBe(cols);
    expect(maze[1][1]).toBe(0); // Start is open
    expect(maze[rows - 2][cols - 2]).toBe(0); // Exit is open

    // BFS shortest path must be reachable (> 0)
    const shortestPath = computeShortestPath(maze, 1, 1, rows - 2, cols - 2);
    expect(shortestPath).toBeGreaterThan(0);
  });

  it('continuous collision detection blocks movement into walls and outside bounds', () => {
    // 3x3 grid with walls all around and open center
    // 1 1 1
    // 1 0 1
    // 1 1 1
    const grid = [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1],
    ];

    // Current player at (1,1). Moving in any direction hits a wall
    expect(validateMazeMove(grid, 1, 1, 'up', 3, 3)).toEqual({ success: false, toRow: 1, toCol: 1 });
    expect(validateMazeMove(grid, 1, 1, 'down', 3, 3)).toEqual({ success: false, toRow: 1, toCol: 1 });
    expect(validateMazeMove(grid, 1, 1, 'left', 3, 3)).toEqual({ success: false, toRow: 1, toCol: 1 });
    expect(validateMazeMove(grid, 1, 1, 'right', 3, 3)).toEqual({ success: false, toRow: 1, toCol: 1 });

    // Out of bounds test
    expect(validateMazeMove(grid, 0, 0, 'up', 3, 3)).toEqual({ success: false, toRow: 0, toCol: 0 });
  });

  it('validates legal move into an open path cell', () => {
    const grid = [
      [1, 1, 1],
      [1, 0, 0],
      [1, 1, 1],
    ];

    const result = validateMazeMove(grid, 1, 1, 'right', 3, 3);
    expect(result).toEqual({ success: true, toRow: 1, toCol: 2 });
  });
});
