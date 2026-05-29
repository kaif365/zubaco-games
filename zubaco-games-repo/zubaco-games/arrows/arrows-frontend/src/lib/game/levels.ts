import { Level } from "./types";

// All levels have been manually verified to be solvable.
export const LEVELS: Level[] = [
  {
    id: 1,
    title: "Tutorial",
    gridSize: 3,
    // Solution: (0,1)↑ → (1,1)↑ → (0,0)→
    arrows: [
      { row: 0, col: 0, direction: "right" },
      { row: 0, col: 1, direction: "up" },
      { row: 1, col: 1, direction: "up" },
    ],
  },
  {
    id: 2,
    title: "Stepping Stones",
    gridSize: 4,
    // Solution: (0,1)→ → (1,1)→ → (2,2)↑ → (2,1)↑ → (0,0)↓
    arrows: [
      { row: 0, col: 0, direction: "down" },
      { row: 0, col: 1, direction: "right" },
      { row: 1, col: 1, direction: "right" },
      { row: 2, col: 1, direction: "up" },
      { row: 2, col: 2, direction: "up" },
    ],
  },
  {
    id: 3,
    title: "The Cross",
    gridSize: 4,
    // Solution: (1,2)↓ → (0,2)↓ → (0,1)→ → (0,0)→ → (2,1)↑ → (2,0)↑
    arrows: [
      { row: 0, col: 0, direction: "right" },
      { row: 0, col: 1, direction: "right" },
      { row: 0, col: 2, direction: "down" },
      { row: 1, col: 2, direction: "down" },
      { row: 2, col: 0, direction: "up" },
      { row: 2, col: 1, direction: "up" },
    ],
  },
  {
    id: 4,
    title: "Detour",
    gridSize: 5,
    // Solution: (0,1)→ → (1,4)← → (2,2)→ → (2,1)↑ → (4,0)→ → (0,0)↓
    arrows: [
      { row: 0, col: 0, direction: "down" },
      { row: 0, col: 1, direction: "right" },
      { row: 1, col: 4, direction: "left" },
      { row: 2, col: 1, direction: "up" },
      { row: 2, col: 2, direction: "right" },
      { row: 4, col: 0, direction: "right" },
    ],
  },
  {
    id: 5,
    title: "Chain Reaction",
    gridSize: 5,
    // Solution: (3,2)↑ → (4,2)↑ → (4,1)→ → (1,3)↓ → (0,3)↓ → (0,0)→ → (2,4)↑ → (2,0)→
    arrows: [
      { row: 0, col: 0, direction: "right" },
      { row: 0, col: 3, direction: "down" },
      { row: 1, col: 3, direction: "down" },
      { row: 2, col: 0, direction: "right" },
      { row: 2, col: 4, direction: "up" },
      { row: 3, col: 2, direction: "up" },
      { row: 4, col: 1, direction: "right" },
      { row: 4, col: 2, direction: "up" },
    ],
  },
  {
    id: 6,
    title: "Corner Trap",
    gridSize: 5,
    // Solution: (3,0)→ → (0,0)↓ → (0,3)→ → (3,3)↑ → (4,1)→ → (1,1)↓ → (2,2)←
    arrows: [
      { row: 0, col: 0, direction: "down" },
      { row: 0, col: 3, direction: "right" },
      { row: 1, col: 1, direction: "down" },
      { row: 2, col: 2, direction: "left" },
      { row: 3, col: 0, direction: "right" },
      { row: 3, col: 3, direction: "up" },
      { row: 4, col: 1, direction: "right" },
    ],
  },
  {
    id: 7,
    title: "The Maze",
    gridSize: 5,
    // Solution: (0,3)→ → (3,2)→ → (2,3)↑ → (0,2)↓ → (4,3)↑ → (2,0)→ → (4,1)→ → (4,0)↑
    arrows: [
      { row: 0, col: 2, direction: "down" },
      { row: 0, col: 3, direction: "right" },
      { row: 2, col: 0, direction: "right" },
      { row: 2, col: 3, direction: "up" },
      { row: 3, col: 2, direction: "right" },
      { row: 4, col: 0, direction: "up" },
      { row: 4, col: 1, direction: "right" },
      { row: 4, col: 3, direction: "up" },
    ],
  },
  {
    id: 8,
    title: "Gridlock",
    gridSize: 6,
    // Solution: (0,5)← → (1,5)← → (2,5)↑ → (5,0)→ → (5,3)↑ → (3,3)↑ → (0,0)↓ → (3,0)→ → (1,2)↓
    arrows: [
      { row: 0, col: 0, direction: "down" },
      { row: 0, col: 5, direction: "left" },
      { row: 1, col: 2, direction: "down" },
      { row: 1, col: 5, direction: "left" },
      { row: 2, col: 5, direction: "up" },
      { row: 3, col: 0, direction: "right" },
      { row: 3, col: 3, direction: "up" },
      { row: 5, col: 0, direction: "right" },
      { row: 5, col: 3, direction: "up" },
    ],
  },
  {
    id: 9,
    title: "Rush Hour",
    gridSize: 6,
    // Solution: (0,3)↓ → (2,5)← → (3,5)← → (4,5)↑ → (5,2)→ → (5,0)→ → (1,0)↓ → (0,0)→ → (3,2)↑ → (4,0)→
    arrows: [
      { row: 0, col: 0, direction: "right" },
      { row: 0, col: 3, direction: "down" },
      { row: 1, col: 0, direction: "down" },
      { row: 2, col: 5, direction: "left" },
      { row: 3, col: 2, direction: "up" },
      { row: 3, col: 5, direction: "left" },
      { row: 4, col: 0, direction: "right" },
      { row: 4, col: 5, direction: "up" },
      { row: 5, col: 0, direction: "right" },
      { row: 5, col: 2, direction: "right" },
    ],
  },
  {
    id: 10,
    title: "Grand Finale",
    gridSize: 6,
    // Solution: (0,2)→ → (1,0)↓ → (2,4)→ → (4,5)↑ → (2,2)↑ → (1,3)← → (5,4)↑ → (4,3)↑ → (5,3)↑ → (4,2)→ → (5,1)→ → (3,1)↓
    arrows: [
      { row: 0, col: 2, direction: "right" },
      { row: 1, col: 0, direction: "down" },
      { row: 1, col: 3, direction: "left" },
      { row: 2, col: 2, direction: "up" },
      { row: 2, col: 4, direction: "right" },
      { row: 3, col: 1, direction: "down" },
      { row: 4, col: 2, direction: "right" },
      { row: 4, col: 3, direction: "up" },
      { row: 4, col: 5, direction: "up" },
      { row: 5, col: 1, direction: "right" },
      { row: 5, col: 3, direction: "up" },
      { row: 5, col: 4, direction: "up" },
    ],
  },
];
