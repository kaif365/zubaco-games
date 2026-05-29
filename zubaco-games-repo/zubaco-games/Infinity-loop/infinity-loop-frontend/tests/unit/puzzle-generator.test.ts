import { generateSolvableGrid, shuffleGrid } from "@/lib/game/logic/generator";
import { describe, expect, it } from "vitest";

describe("generator", () => {
  it("creates requested grid dimensions", () => {
    const grid = generateSolvableGrid(4, 5);
    expect(grid).toHaveLength(5);
    expect(grid[0]).toHaveLength(4);
  });

  it("shuffle keeps dimensions intact", () => {
    const original = generateSolvableGrid(3, 3);
    const shuffled = shuffleGrid(original);
    expect(shuffled).toHaveLength(3);
    expect(shuffled[0]).toHaveLength(3);
  });
});
