"use client";

import { motion } from "motion/react";
import { TileType } from "@/types/tile";

// ─── localStorage helpers ────────────────────────────────────────────────────

const STORAGE_PREFIX = "infinity-loop";

export function getHighestLevel(): number {
  if (typeof window === "undefined") return 1;
  return Number(localStorage.getItem(`${STORAGE_PREFIX}-highest-level`)) || 1;
}

export function setHighestLevel(level: number): void {
  const current = getHighestLevel();
  if (level > current) {
    localStorage.setItem(`${STORAGE_PREFIX}-highest-level`, String(level));
  }
}

export function getLevelStars(level: number): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(`${STORAGE_PREFIX}-level-stars-${level}`)) || 0;
}

export function setLevelStars(level: number, stars: number): void {
  const current = getLevelStars(level);
  if (stars > current) {
    localStorage.setItem(`${STORAGE_PREFIX}-level-stars-${level}`, String(stars));
  }
}

// ─── Level Configurations ────────────────────────────────────────────────────

export interface LevelConfig {
  level: number;
  width: number;
  height: number;
  allowedTiles: TileType[];
  timeLimitSeconds: number | null; // null = no timer
  label: string;
}

export const LEVELS: LevelConfig[] = [
  { level: 1, width: 4, height: 4, allowedTiles: [TileType.STRAIGHT, TileType.ELBOW], timeLimitSeconds: null, label: "Beginner" },
  { level: 2, width: 4, height: 4, allowedTiles: [TileType.STRAIGHT, TileType.ELBOW, TileType.CAP], timeLimitSeconds: null, label: "Easy" },
  { level: 3, width: 5, height: 5, allowedTiles: [TileType.STRAIGHT, TileType.ELBOW, TileType.CAP], timeLimitSeconds: null, label: "Simple" },
  { level: 4, width: 5, height: 5, allowedTiles: [TileType.STRAIGHT, TileType.ELBOW, TileType.CAP, TileType.TEE, TileType.CURVED_V], timeLimitSeconds: null, label: "Moderate" },
  { level: 5, width: 5, height: 5, allowedTiles: [TileType.STRAIGHT, TileType.ELBOW, TileType.CAP, TileType.TEE, TileType.CURVED_V, TileType.CROSS], timeLimitSeconds: 180, label: "Intermediate" },
  { level: 6, width: 6, height: 6, allowedTiles: [TileType.STRAIGHT, TileType.ELBOW, TileType.CAP, TileType.TEE, TileType.CURVED_V, TileType.CROSS], timeLimitSeconds: 180, label: "Challenging" },
  { level: 7, width: 6, height: 6, allowedTiles: [TileType.STRAIGHT, TileType.ELBOW, TileType.CAP, TileType.TEE, TileType.CURVED_V, TileType.CROSS], timeLimitSeconds: 150, label: "Hard" },
  { level: 8, width: 7, height: 7, allowedTiles: [TileType.STRAIGHT, TileType.ELBOW, TileType.CAP, TileType.TEE, TileType.CURVED_V, TileType.CROSS], timeLimitSeconds: 150, label: "Expert" },
  { level: 9, width: 7, height: 7, allowedTiles: [TileType.STRAIGHT, TileType.ELBOW, TileType.CAP, TileType.TEE, TileType.CURVED_V, TileType.CROSS], timeLimitSeconds: 120, label: "Master" },
  { level: 10, width: 8, height: 8, allowedTiles: [TileType.STRAIGHT, TileType.ELBOW, TileType.CAP, TileType.TEE, TileType.CURVED_V, TileType.CROSS], timeLimitSeconds: 120, label: "Grandmaster" },
];

// ─── Component ───────────────────────────────────────────────────────────────

interface LevelSelectorProps {
  readonly onSelect: (config: LevelConfig) => void;
  readonly onBack: () => void;
}

export function LevelSelector({ onSelect, onBack }: LevelSelectorProps) {
  const highestUnlocked = getHighestLevel();

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-lg font-bold text-white">Select Level</h2>
        <div className="w-16" />
      </div>

      {/* Level Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          {LEVELS.map((lvl, i) => {
            const isUnlocked = lvl.level <= highestUnlocked;
            const stars = getLevelStars(lvl.level);

            return (
              <motion.button
                key={lvl.level}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => isUnlocked && onSelect(lvl)}
                disabled={!isUnlocked}
                className={`relative rounded-xl border p-4 text-center transition-all ${
                  isUnlocked
                    ? "border-emerald-500/30 bg-slate-800/80 hover:border-emerald-400/60 active:scale-95"
                    : "border-slate-700/30 bg-slate-900/50 opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="text-2xl font-bold text-white mb-1">
                  {isUnlocked ? lvl.level : "🔒"}
                </div>
                <div className="text-xs text-slate-400 mb-2">{lvl.label}</div>
                <div className="text-xs text-slate-500">
                  {lvl.width}×{lvl.height}
                  {lvl.timeLimitSeconds && ` • ${lvl.timeLimitSeconds}s`}
                </div>
                {/* Stars */}
                {isUnlocked && (
                  <div className="mt-2 flex justify-center gap-0.5">
                    {[1, 2, 3].map((s) => (
                      <span
                        key={s}
                        className={`text-sm ${s <= stars ? "text-amber-400" : "text-slate-600"}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
