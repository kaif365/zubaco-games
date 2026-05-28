"use client";

import { LEVELS } from "@/lib/game/levels";
import { MAX_LIVES } from "@/lib/game/types";

interface HUDProps {
  levelIndex: number;
  lives: number;
  hints: number;
  zoom: number;
  onZoom: (v: number) => void;
  onHint: () => void;
}

export function HUD({
  levelIndex,
  lives,
  hints,
  zoom,
  onZoom,
  onHint,
}: HUDProps) {
  const level = LEVELS[levelIndex];

  return (
    <>
      {/* Top bar */}
      <div className="flex flex-col items-center gap-2 py-4 border-b border-slate-100 w-full">
        <p className="text-indigo-600 font-bold text-lg tracking-wide">
          Level {level.id}
        </p>
        <div className="flex gap-2">
          {Array.from({ length: MAX_LIVES }, (_, i) => (
            <span
              key={i}
              className={`text-2xl transition-all duration-300 ${i < lives ? "opacity-100 scale-100" : "opacity-30 grayscale scale-90"}`}
            >
              ❤️
            </span>
          ))}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex items-center gap-3 py-3 px-4 border-t border-slate-100 w-full justify-center">
        {/* Hint button */}
        <button
          onClick={onHint}
          disabled={hints <= 0}
          className="relative flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 border border-amber-200 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title={`Hint (${hints} left)`}
        >
          <span className="text-xl">💡</span>
          <span className="absolute -top-1 -right-1 bg-slate-700 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {hints}
          </span>
        </button>

        {/* Zoom slider */}
        <div className="flex items-center gap-2 bg-slate-100 rounded-full px-4 py-2">
          <span className="text-slate-400 text-sm">🔍−</span>
          <input
            type="range"
            min={0.5}
            max={1.8}
            step={0.05}
            value={zoom}
            onChange={(e) => onZoom(parseFloat(e.target.value))}
            className="w-32 accent-indigo-500"
          />
          <span className="text-slate-400 text-sm">🔍+</span>
        </div>

        {/* Grid toggle placeholder (visual parity) */}
        <button className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-colors text-slate-500 font-bold text-lg">
          #
        </button>
      </div>
    </>
  );
}
