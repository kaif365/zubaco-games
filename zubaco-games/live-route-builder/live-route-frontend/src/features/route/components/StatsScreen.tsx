import { motion } from 'framer-motion';

// ─── Types & Storage ─────────────────────────────────────────────────────────

export interface GameStats {
  totalGamesPlayed: number;
  totalWins: number;
  totalEdges: number;
  bestEfficiency: number | null;
  maxStreak: number;
  highestLevel: number;
  perfectGames: number;
  fastCompletions: number;
  totalTimePlayed: number; // seconds
  highestScore: number;
  recentScores: number[];
}

const STORAGE_KEY = 'live-route-stats';

function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return createEmptyStats();
}

function createEmptyStats(): GameStats {
  return {
    totalGamesPlayed: 0,
    totalWins: 0,
    totalEdges: 0,
    bestEfficiency: null,
    maxStreak: 0,
    highestLevel: 1,
    perfectGames: 0,
    fastCompletions: 0,
    totalTimePlayed: 0,
    highestScore: 0,
      recentScores: [],
  };
}

export function updateStats(update: Partial<GameStats> & { addEdges?: number; addTime?: number }): GameStats {
  const stats = loadStats();
  if (update.totalGamesPlayed !== undefined) stats.totalGamesPlayed = update.totalGamesPlayed;
  if (update.totalWins !== undefined) stats.totalWins = update.totalWins;
  if (update.addEdges) stats.totalEdges += update.addEdges;
  if (update.bestEfficiency !== undefined && (stats.bestEfficiency === null || update.bestEfficiency > stats.bestEfficiency)) {
    stats.bestEfficiency = update.bestEfficiency;
  }
  if (update.maxStreak !== undefined && update.maxStreak > stats.maxStreak) stats.maxStreak = update.maxStreak;
  if (update.highestLevel !== undefined && update.highestLevel > stats.highestLevel) stats.highestLevel = update.highestLevel;
  if (update.perfectGames !== undefined) stats.perfectGames = update.perfectGames;
  if (update.fastCompletions !== undefined) stats.fastCompletions = update.fastCompletions;
  if (update.addTime) stats.totalTimePlayed += update.addTime;
  if (update.highestScore !== undefined && update.highestScore > stats.highestScore) stats.highestScore = update.highestScore;
  stats.recentScores = [score, ...(stats.recentScores || [])].slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  return stats;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface StatsScreenProps {
  readonly onBack: () => void;
}

export function StatsScreen({ onBack }: StatsScreenProps) {
  const stats = loadStats();

  const statItems = [
    { label: 'Games Played', value: stats.totalGamesPlayed, icon: '🎮' },
    { label: 'Wins', value: stats.totalWins, icon: '✅' },
    { label: 'Total Edges', value: stats.totalEdges, icon: '🔗' },
    { label: 'Best Efficiency', value: stats.bestEfficiency !== null ? `${Math.round(stats.bestEfficiency)}%` : '—', icon: '📐' },
    { label: 'Best Streak', value: stats.maxStreak, icon: '🔥' },
    { label: 'Highest Level', value: stats.highestLevel, icon: '📈' },
    { label: 'Perfect Games', value: stats.perfectGames, icon: '💎' },
    { label: 'Highest Score', value: stats.highestScore, icon: '🏅' },
    { label: 'Time Played', value: formatTime(stats.totalTimePlayed), icon: '⏱️' },
    { label: 'Avg Edges/Game', value: stats.totalGamesPlayed > 0 ? Math.round(stats.totalEdges / stats.totalGamesPlayed) : '—', icon: '📊' },
  ];

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 p-6">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-lg font-bold text-white">Statistics</h2>
        <div className="w-16" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          {statItems.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-slate-700/40 bg-slate-800/60 p-4 text-center"
            >
              <div className="mb-1 text-xl">{item.icon}</div>
              <div className="text-lg font-bold text-white">{item.value}</div>
              <div className="text-xs text-slate-400">{item.label}</div>
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

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
