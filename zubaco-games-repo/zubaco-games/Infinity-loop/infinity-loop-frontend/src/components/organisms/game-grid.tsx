// /components/organisms/game-grid.tsx
"use client";

import { TileCard } from "@/components/molecules/tile-card";
import { GameConfig } from "@/types/game-config";
import { GridCell } from "@/types/tile";

interface Props {
  readonly grid: GridCell[][];
  readonly config: GameConfig;
  readonly theme: { primary: string; glow: string; background: string };
  readonly onTileClick: (x: number, y: number) => void;
  readonly hintedCells?: { x: number; y: number }[];
}

export const GameGrid = ({
  grid,
  theme,
  onTileClick,
  hintedCells = [],
}: Props) => {
  if (!grid.length) return null;

  const width = grid[0].length;

  return (
    <div
      className="grid gap-0 mx-auto"
      style={{
        gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
        maxWidth: `${width * 110}px`,
      }}
    >
      {grid.map((row, y) =>
        row.map((cell, x) => (
          <TileCard
            key={`${x}-${y}`}
            cell={cell}
            primaryColor={theme.primary}
            accentColor={theme.primary}
            glowColor={theme.glow}
            isHinted={hintedCells.some((h) => h.x === x && h.y === y)}
            onClick={() => onTileClick(x, y)}
          />
        )),
      )}
    </div>
  );
};
