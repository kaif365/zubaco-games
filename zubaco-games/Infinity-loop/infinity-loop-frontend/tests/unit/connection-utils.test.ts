import { TileType } from "@/types/tile";
import { getBaseConnections, rotateConnections } from "@/utils/tile";
import { describe, expect, it } from "vitest";

describe("tile utils", () => {
  it("returns elbow base connections", () => {
    expect(getBaseConnections(TileType.ELBOW)).toEqual({
      top: true,
      right: true,
      bottom: false,
      left: false,
    });
  });

  it("rotates cap connection clockwise", () => {
    expect(
      rotateConnections(
        { top: true, right: false, bottom: false, left: false },
        1,
      ),
    ).toEqual({ top: false, right: true, bottom: false, left: false });
  });
});
