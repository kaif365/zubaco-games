import { describe, expect, it } from "vitest";

import {
  shouldInitializeTutorialBoard,
  shouldResetLiveBoardShellOnDimensionChange,
} from "@/hooks/use-game-state";

describe("useGameState live reset guard", () => {
  it("allows tutorial boards to rebuild when dimensions change", () => {
    expect(shouldResetLiveBoardShellOnDimensionChange(true, false)).toBe(true);
    expect(shouldResetLiveBoardShellOnDimensionChange(true, true)).toBe(true);
  });

  it("allows live shell resets before the first server board arrives", () => {
    expect(shouldResetLiveBoardShellOnDimensionChange(false, false)).toBe(
      true,
    );
  });

  it("blocks live shell resets after a server board has hydrated", () => {
    expect(shouldResetLiveBoardShellOnDimensionChange(false, true)).toBe(
      false,
    );
  });

  it("keeps tutorial board initialization blocked while bootstrap is pending", () => {
    expect(shouldInitializeTutorialBoard(true, true)).toBe(false);
  });

  it("allows tutorial board initialization after bootstrap completes", () => {
    expect(shouldInitializeTutorialBoard(true, false)).toBe(true);
  });

  it("never initializes tutorial board logic for live mode", () => {
    expect(shouldInitializeTutorialBoard(false, false)).toBe(false);
    expect(shouldInitializeTutorialBoard(false, true)).toBe(false);
  });
});
