"use client";

import { cn } from "@/utils/cn";
import type { InfinityTileCell } from "@/types/games/infinity-loop/infinity-loop-board-editor";
import { InfinityPhaserLoopGrid } from "./InfinityPhaserLoopGrid";
import {
  INFINITY_TILE_RENDER_TYPE,
  type InfinityTileRenderType,
} from "@/lib/game/phaser/InfinityLoopScene";

export { INFINITY_TILE_RENDER_TYPE };
export type { InfinityTileRenderType };

interface InfinityLoopGridProps {
  readonly grid: InfinityTileCell[][];
  readonly editable?: boolean;
  readonly onRotateTile?: (x: number, y: number) => void;
  readonly className?: string;
  readonly tileType?: InfinityTileRenderType;
  readonly forceMobileViewport?: boolean;
}

export const InfinityLoopGrid = ({
  grid,
  editable = false,
  onRotateTile,
  className,
  tileType = INFINITY_TILE_RENDER_TYPE.FILLED,
  forceMobileViewport = true,
}: InfinityLoopGridProps) => {
  return (
    <div
      className={cn(
        "mx-auto aspect-square w-full max-w-105 overflow-hidden rounded-2xl border border-cyan-300/40 bg-[#040814] shadow-[0_0_36px_rgba(34,245,255,0.22)]",
        className,
      )}
    >
      <InfinityPhaserLoopGrid
        grid={grid}
        onTileClick={editable ? onRotateTile : undefined}
        className="h-full w-full"
        tileType={tileType}
        forceMobileViewport={forceMobileViewport}
      />
    </div>
  );
};
