"use client";

import { LEVELS } from "@/lib/game/levels";

interface WinOverlayProps {
  levelIndex: number;
  moves: number;
  onNextLevel: () => void;
  onReset: () => void;
}

export function WinOverlay({
  levelIndex,
  moves,
  onNextLevel,
  onReset,
}: WinOverlayProps) {
  const isLastLevel = levelIndex === LEVELS.length - 1;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-xl text-center">
        <div className="text-5xl animate-bounce">🎉</div>
        <h3 className="text-slate-800 text-2xl font-bold">Level Clear!</h3>
        <p className="text-slate-400 text-sm">
          Solved in <span className="text-indigo-600 font-bold">{moves}</span>{" "}
          move{moves !== 1 ? "s" : ""}
        </p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={onReset}
            className="px-5 py-2 rounded-full border border-slate-300 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
          >
            ↺ Replay
          </button>
          {!isLastLevel ? (
            <button
              onClick={onNextLevel}
              className="px-5 py-2 rounded-full bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors"
            >
              Next Level →
            </button>
          ) : (
            <p className="text-amber-500 font-semibold self-center">
              All levels complete! 🏆
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
