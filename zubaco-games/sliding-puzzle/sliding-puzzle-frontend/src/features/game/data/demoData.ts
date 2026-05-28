import type { DemoLevel } from '@/types/sliding-puzzle';

/**
 * Number of demo boards to show the player when they first start the game.
 * Boards are taken from the front of the flattened demoLevels array.
 */
export const demoCount = 2;

/**
 * Local demo levels. Each level contains one or more boards.
 * Images are served from public/demo/ — add new boards by dropping images there
 * and adding entries below.
 *
 * initialPieces: flat array of tile indices (0-based) with -1 for the blank tile.
 * Solved state for a 3×3 is [0,1,2,3,4,5,6,7,-1].
 */
export const demoLevels: DemoLevel[] = [
  {
    levelName: 'Level 1',
    boards: [
      {
        id: 'demo-board-1',
        gridSize: { x: 2, y: 2 },
        fullImageUrl: "https://dy47qp4b6jtbv.cloudfront.net/uploads/sliding-puzzle/1779185919880-7c35249e-3446-4ef5-b42f-a500700ffd5f.jpg",
        displayTime: 5,
        // 2 moves from solved: blank moved up then left
        initialPieces: [0, 1, 2, -1],
      },
    ],
  },
  {
    levelName: 'Level 2',
    boards: [
      {
        id: 'demo-board-2',
        gridSize: { x: 3, y: 3 },
        fullImageUrl: "https://dy47qp4b6jtbv.cloudfront.net/uploads/sliding-puzzle/1779185385586-61f995b4-5923-459d-bd13-c656b90b9502.jpg",
        displayTime: 4,
        // 2 moves from solved: blank moved up then right
        initialPieces: [0, 1, 2, 3, 5, -1, 6, 4, 7],
      },
    ],
  },
];