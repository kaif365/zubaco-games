"use client";

import { motion } from "motion/react";

interface GameHeaderProps {
  readonly level: number;
  readonly moves: number;
  readonly combo: number;
  readonly timeElapsed: number;
  readonly timeLimit: number | null;
  readonly onPause: () => void;
  readonly onMute: () => void;
}

export function GameHeader({
  level,
  moves,
  combo,
  timeElapsed,
  timeLimit,
  onPause,
  onMute,
}: GameHeaderProps) {
  const timeRemaining = timeLimit ? Math.max(0, timeLimit - timeElapsed) : null;
  const isLowTime = timeRemaining !== null && timeRemaining <= 30;

  return (
    <div className="fixed top-0 left-0 right-0 z-30 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800/50">
      <div className="flex items-center justify-between px-4 py-2.5 max-w-lg mx-auto">
        {/* Left: Level Badge */}
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-2.5 py-1 text-xs font-bold text-emerald-400">
            LVL {level}
          </span>
          <span className="text-xs text-slate-400">
            {moves} moves
          </span>
        </div>

        {/* Center: Combo (if active) */}
        {combo >= 2 && (
          <motion.div
            key={combo}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1"
          >
            <span className="text-xs font-bold text-amber-400">🔥 ×{combo}</span>
          </motion.div>
        )}

        {/* Right: Timer + Controls */}
        <div className="flex items-center gap-2">
          {timeRemaining !== null && (
            <span
              className={`text-xs font-mono font-bold ${
                isLowTime ? "text-red-400 animate-pulse" : "text-slate-300"
              }`}
            >
              {formatTime(timeRemaining)}
            </span>
          )}
          <button
            onClick={onMute}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white transition-colors"
            title="Toggle sound"
          >
            🔊
          </button>
          <button
            onClick={onPause}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white transition-colors"
            title="Pause"
          >
            ⏸️
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
