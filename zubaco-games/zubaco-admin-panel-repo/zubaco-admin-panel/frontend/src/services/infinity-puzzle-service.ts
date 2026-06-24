import { generateInfinityPuzzles } from "@/services/infinity-puzzle-generator";
import type {
  InfinityPuzzlePair,
  InfinityTileCell,
} from "@/types/games/infinity-loop/infinity-loop-board-editor";
import { backendTileIdToTypeAndRotation } from "@/utils/infinity-tile-bitmasks";

const toTileGrid = (grid: number[][]): InfinityTileCell[][] =>
  grid.map((row, y) =>
    row.map((tileId, x) => {
      const tile = backendTileIdToTypeAndRotation(tileId);
      return {
        x,
        y,
        type: tile.type,
        rotation: tile.rotation,
        correctRotation: tile.rotation,
        isCorrect: true,
      };
    }),
  );

export async function getInfinityPuzzlePairsByGrid(
  rows: number,
  columns: number,
  difficulty: "easy" | "medium" | "hard" = "medium",
  limit = 1,
  token?: string,
  gameName?: string,
): Promise<InfinityPuzzlePair[]> {
  const normalizedLimit = Math.min(Math.max(limit, 1), 10);
  const response = await generateInfinityPuzzles(
    {
      rows,
      cols: columns,
      difficulty,
      limit: normalizedLimit,
    },
    token,
    gameName,
  );

  const generated = response.data ?? [];
  return generated.map((item, index) => ({
    id: item.seed || crypto.randomUUID(),
    label: `Puzzle ${index + 1}`,
    completeGrid: toTileGrid(item.solvedGrid),
    randomizedGrid: toTileGrid(item.scrambledGrid),
  }));
}
