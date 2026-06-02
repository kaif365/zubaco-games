import { motion } from 'motion/react';

// ─── Types & Storage ─────────────────────────────────────────────────────────

export interface GameStats {
  totalGamesPlayed: number;
  totalWins: number;
  totalMoves: number;
  fewestMoves: number;
  maxStreak: number;
  highestLevel: number;
  perfectMazes: number;
  fastCompletions: number;
  totalTimeSec: number;
  highestScore: number;
  recentScores: number[];
}

const STORAGE_KEY = 'maze-navigation-stats';

function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    totalGamesPlayed: 0,
    totalWins: 0,
    totalMoves: 0,
    fewestMoves: 0,
    maxStreak: 0,
    highestLevel: 0,
    perfectMazes: 0,
    fastCompletions: 0,
    totalTimeSec: 0,
    highestScore: 0,
      recentScores: [],
  };
}

function saveStats(stats: GameStats): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function updateStats(updates: Partial<{
  totalGamesPlayed: number;
  totalWins: number;
  addMoves: number;
  fewestMoves: number;
  maxStreak: number;
  highestLevel: number;
  perfectMazes: number;
  fastCompletions: number;
  addTime: number;
  highestScore: number;
}>): GameStats {
  const stats = loadStats();
  if (updates.totalGamesPlayed !== undefined) stats.totalGamesPlayed = updates.totalGamesPlayed;
  if (updates.totalWins !== undefined) stats.totalWins = updates.totalWins;
  if (updates.addMoves !== undefined) stats.totalMoves += updates.addMoves;
  if (updates.fewestMoves !== undefined && (stats.fewestMoves === 0 || updates.fewestMoves < stats.fewestMoves)) stats.fewestMoves = updates.fewestMoves;
  if (updates.maxStreak !== undefined) stats.maxStreak = Math.max(stats.maxStreak, updates.maxStreak);
  if (updates.highestLevel !== undefined) stats.highestLevel = Math.max(stats.highestLevel, updates.highestLevel);
  if (updates.perfectMazes !== undefined) stats.perfectMazes = updates.perfectMazes;
  if (updates.fastCompletions !== undefined) stats.fastCompletions = updates.fastCompletions;
  if (updates.addTime !== undefined) stats.totalTimeSec += updates.addTime;
  if (updates.highestScore !== undefined) stats.highestScore = Math.max(stats.highestScore, updates.highestScore);
  if (updates.highestScore !== undefined) stats.recentScores = [updates.highestScore, ...(stats.recentScores || [])].slice(0, 20);
  saveStats(stats);
  return stats;
}

export function getStats(): GameStats {
  return loadStats();
}

// ─── Component ───────────────────────────────────────────────────────────────

interface StatsScreenProps {
  readonly onBack: () => void;
}

const STAT_DISPLAY = [
  { key: 'totalGamesPlayed', label: 'Games Played', icon: '🎮' },
  { key: 'totalWins', label: 'Mazes Solved', icon: '✅' },
  { key: 'totalMoves', label: 'Total Moves', icon: '👣' },
  { key: 'fewestMoves', label: 'Fewest Moves', icon: '🎯' },
  { key: 'maxStreak', label: 'Best Streak', icon: '🔥' },
  { key: 'highestLevel', label: 'Highest Level', icon: '🗺️' },
  { key: 'perfectMazes', label: 'Perfect Mazes', icon: '💎' },
  { key: 'fastCompletions', label: 'Speed Runs', icon: '⚡' },
  { key: 'totalTimeSec', label: 'Total Time', icon: '⏱️', format: 'time' },
  { key: 'highestScore', label: 'High Score', icon: '📈' },
] as const;

export function StatsScreen({ onBack }: StatsScreenProps) {
  const stats = loadStats();

  function formatValue(value: number, format?: string): string {
    if (format === 'time') {
      const h = Math.floor(value / 3600);
      const m = Math.floor((value % 3600) / 60);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
    return value.toLocaleString();
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 p-6">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors">
          ← Back
        </button>
        <h2 className="text-lg font-bold text-white">Statistics</h2>
        <div className="w-16" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          {STAT_DISPLAY.map((stat, i) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-slate-700/40 bg-slate-800/60 p-4 text-center"
            >
              <div className="text-xl mb-1">{stat.icon}</div>
              <p className="text-lg font-bold text-white">
                {formatValue((stats as Record<string, number>)[stat.key] ?? 0, stat.format)}
              </p>
              <p className="text-[11px] text-slate-400">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    
      {stats.recentScores && stats.recentScores.length > 1 && (
        <div className="p-4 bg-gray-800/60 rounded-xl border border-gray-700/50">
          <div className="text-sm font-medium text-gray-300 mb-3">Recent Scores</div>
          <div className="flex items-end gap-1 h-16">
            {stats.recentScores.slice(0, 15).map((s, idx) => {
              const max = Math.max(...stats.recentScores, 1);
              const height = Math.max(4, (s / max) * 100);
              return (
                <motion.div
                  key={idx}
                  className="flex-1 bg-indigo-500 rounded-t"
                  style={{ height: `${height}%` }}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: idx * 0.05 }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
