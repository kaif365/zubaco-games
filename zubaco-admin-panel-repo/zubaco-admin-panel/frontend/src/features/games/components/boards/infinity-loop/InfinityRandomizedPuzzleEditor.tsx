"use client";

import { Button } from "@/components/ui/button";
import {
  InfinityLoopGrid,
  INFINITY_TILE_RENDER_TYPE,
} from "./InfinityLoopGrid";
import type { InfinityTileCell } from "@/types/games/infinity-loop/infinity-loop-board-editor";
import { createPortal } from "react-dom";

interface InfinityRandomizedPuzzleEditorProps {
  readonly open: boolean;
  readonly grid: InfinityTileCell[][];
  readonly onRotateTile: (x: number, y: number) => void;
  readonly onClose: () => void;
  readonly onSave: () => void;
}

export const InfinityRandomizedPuzzleEditor = ({
  open,
  grid,
  onRotateTile,
  onClose,
  onSave,
}: InfinityRandomizedPuzzleEditorProps) => {
  // Client-only portal target (avoid touching `document` during prerender).
  if (!open) return null;
  if (typeof document === "undefined") return null;

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-6">
      <div className="grid w-full max-w-6xl gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">
            Edit Randomized Puzzle
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/12 hover:text-white"
              onClick={onClose}
            >
              Close
            </Button>
            <Button onClick={onSave}>Save Randomized Puzzle</Button>
          </div>
        </div>
        <div className="flex min-h-[70vh] items-center justify-center">
          <InfinityLoopGrid
            grid={grid}
            editable
            onRotateTile={onRotateTile}
            className="w-[min(82vh,82vw)] max-w-225"
            tileType={INFINITY_TILE_RENDER_TYPE.FILLED}
          />
        </div>
      </div>
    </div>
  );

  // Portal to <body> so the overlay centers relative to the viewport (not a transformed parent).
  return createPortal(content, document.body);
};
