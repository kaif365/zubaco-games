import {
  generateMaze,
  getDirectionVector,
  getOppositeDirection,
} from "@/lib/maze/maze-gen";
import { Direction } from "@/types/maze";
import { describe, expect, it } from "vitest";

describe("maze-gen", () => {
  it("builds a full maze grid", () => {
    const maze = generateMaze(15, 10);
    expect(maze).toHaveLength(10);
    expect(maze[0]).toHaveLength(15);
  });

  it("marks every cell as visited", () => {
    const maze = generateMaze(6, 6);
    const visitedCount = maze.flat().filter((cell) => cell.visited).length;
    expect(visitedCount).toBe(36);
  });

  it("returns opposite direction correctly", () => {
    expect(getOppositeDirection(Direction.UP)).toBe(Direction.DOWN);
    expect(getOppositeDirection(Direction.LEFT)).toBe(Direction.RIGHT);
  });

  it("returns direction vectors correctly", () => {
    expect(getDirectionVector(Direction.UP)).toEqual({ dx: 0, dy: -1 });
    expect(getDirectionVector(Direction.RIGHT)).toEqual({ dx: 1, dy: 0 });
  });
});
