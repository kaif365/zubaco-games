import type { PuzzlePayload } from "@/types/socket";
import { type GridCell } from "@/types/tile";
import { getConnectionsForState } from "@/utils/tile";
import { getTileDefinitionForBackendId } from "@/utils/tile-bitmasks";

export const buildGridFromPuzzlePayload = (
  puzzle: PuzzlePayload,
): GridCell[][] => {
  return puzzle.grid.map((row, y) =>
    row.map((tileId, x) => {
      const definition = getTileDefinitionForBackendId(tileId);

      return {
        type: definition.type,
        rotation: definition.rotation,
        correctRotation: definition.rotation,
        connections: getConnectionsForState({
          type: definition.type,
          rotation: definition.rotation,
        }),
        x,
        y,
        isCorrect: false,
      };
    }),
  );
};
