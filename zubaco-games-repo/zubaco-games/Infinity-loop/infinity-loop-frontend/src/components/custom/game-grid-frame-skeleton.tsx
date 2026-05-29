"use client";

import {
  GAME_GRID_FRAME_HEIGHT_CLASS,
  GAME_GRID_FRAME_WIDTH_CLASS,
} from "@/components/organisms/game-grid-frame";
import { DEFAULT_LEVEL_PALETTE_PRIMARY } from "@/constants/theme-colors";
import { hexToRgba, isHexColor } from "@/lib/color";

interface GameGridFrameSkeletonProps {
  readonly accentColor: string;
  readonly className?: string;
}

export function GameGridFrameSkeleton({
  accentColor,
  className = "",
}: GameGridFrameSkeletonProps) {
  const safeAccent = isHexColor(accentColor)
    ? accentColor
    : DEFAULT_LEVEL_PALETTE_PRIMARY;
  const scrim = hexToRgba(safeAccent, 0.08);
  const shimmerMid = hexToRgba(safeAccent, 0.12);
  const barStrong = hexToRgba(safeAccent, 0.22);
  const barSoft = hexToRgba(safeAccent, 0.16);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-2xl border-2 ${GAME_GRID_FRAME_WIDTH_CLASS} ${GAME_GRID_FRAME_HEIGHT_CLASS} ${className}`.trim()}
      style={{
        backgroundColor: "transparent",
        borderColor: `${safeAccent}44`,
        boxShadow: `0 0 40px ${safeAccent}22`,
      }}
    >
      <div
        className="absolute inset-0 animate-pulse"
        style={{ backgroundColor: scrim }}
      />
      <div
        className="absolute inset-0 animate-pulse"
        style={{
          backgroundImage: `linear-gradient(90deg, transparent, ${shimmerMid}, transparent)`,
        }}
      />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div
          className="h-2 w-36 animate-pulse rounded-full"
          style={{ backgroundColor: barStrong }}
        />
        <div
          className="h-2 w-24 animate-pulse rounded-full"
          style={{ backgroundColor: barSoft }}
        />
      </div>
    </div>
  );
}
