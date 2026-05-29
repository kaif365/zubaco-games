import { findShortestPath } from "@/utils/maze/find-shortest-path";
import { describe, expect, it } from "vitest";

describe("findShortestPath", () => {
  it("returns shortest walkable path from start to end", () => {
    const grid = [
      [0, 0, 0],
      [1, 1, 0],
      [0, 0, 0],
    ];

    const path = findShortestPath(grid, 0, 0, 2, 2);

    expect(path).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ]);
  });

  it("returns empty array when goal is unreachable", () => {
    const grid = [
      [0, 1, 0],
      [1, 1, 1],
      [0, 1, 0],
    ];

    expect(findShortestPath(grid, 0, 0, 2, 2)).toEqual([]);
  });
});
