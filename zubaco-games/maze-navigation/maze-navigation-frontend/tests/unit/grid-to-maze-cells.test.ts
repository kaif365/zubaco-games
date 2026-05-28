import { gridToMazeCells } from "@/lib/maze/grid-to-maze-cells";
import { Direction } from "@/types/maze";
import { describe, expect, it } from "vitest";

describe("gridToMazeCells", () => {
  it("opens passages only toward walkable neighbors", () => {
    const grid = [
      [1, 1, 1],
      [1, 0, 1],
      [1, 1, 1],
    ];
    const cells = gridToMazeCells(grid);
    const center = cells[1]?.[1];
    expect(center).toBeDefined();
    expect(center?.walls).toBe(0);
  });

  it("connects two adjacent path cells", () => {
    const grid = [
      [1, 1, 1, 1],
      [1, 0, 0, 1],
      [1, 1, 1, 1],
    ];
    const cells = gridToMazeCells(grid);
    const left = cells[1]?.[1];
    const right = cells[1]?.[2];
    expect(left?.walls & Direction.RIGHT).toBeTruthy();
    expect(right?.walls & Direction.LEFT).toBeTruthy();
  });
});
