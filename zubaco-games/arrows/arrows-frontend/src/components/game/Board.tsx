"use client";

import { useState } from "react";
import { Arrow, ArrowVisualState } from "./Arrow";
import { ArrowPiece, Board as BoardType } from "@/lib/game/types";
import { canMove } from "@/lib/game/logic";

interface BoardProps {
  board: BoardType;
  gridSize: number;
  hintId: string | null;
  disabled: boolean;
  onRemove: (id: string) => void;
  onWrongMove: () => void;
}

/** Pixels the arrow must travel to fully exit the board from its current position */
function getTravelPx(
  piece: ArrowPiece,
  gridSize: number,
  cellPx: number,
): number {
  switch (piece.direction) {
    case "right":
      return (gridSize - piece.col) * cellPx;
    case "left":
      return (piece.col + 1) * cellPx;
    case "up":
      return (piece.row + 1) * cellPx;
    case "down":
      return (gridSize - piece.row) * cellPx;
  }
}

export function Board({
  board,
  gridSize,
  hintId,
  disabled,
  onRemove,
  onWrongMove,
}: BoardProps) {
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [shakingId, setShakingId] = useState<string | null>(null);

  const cellPx = Math.max(52, Math.min(76, Math.floor(420 / gridSize)));

  const handleClick = (piece: ArrowPiece) => {
    if (disabled || exitingId) return;
    if (!canMove(piece, board)) {
      setShakingId(piece.id);
      onWrongMove();
      setTimeout(() => setShakingId(null), 420);
      return;
    }
    setExitingId(piece.id);
  };

  const handleExitEnd = (id: string) => {
    onRemove(id);
    setExitingId(null);
  };

  function getVisualState(piece: ArrowPiece): ArrowVisualState {
    if (exitingId === piece.id) return "exiting";
    if (shakingId === piece.id) return "shaking";
    if (hintId === piece.id) return "hint";
    if (canMove(piece, board)) return "movable";
    return "blocked";
  }

  return (
    // overflow-visible so the arrow can visually travel outside its cell while animating
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${gridSize}, ${cellPx}px)`,
        gridTemplateRows: `repeat(${gridSize}, ${cellPx}px)`,
        gap: 0,
        overflow: "visible",
      }}
    >
      {Array.from({ length: gridSize }, (_, r) =>
        Array.from({ length: gridSize }, (_, c) => {
          const piece = board[r]?.[c];
          return (
            <div
              key={`${r}-${c}`}
              style={{ width: cellPx, height: cellPx, overflow: "visible" }}
            >
              {piece && (
                <Arrow
                  piece={piece}
                  visualState={getVisualState(piece)}
                  travelPx={getTravelPx(piece, gridSize, cellPx)}
                  cellPx={cellPx}
                  onClick={() => handleClick(piece)}
                  onExitEnd={() => handleExitEnd(piece.id)}
                />
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}
