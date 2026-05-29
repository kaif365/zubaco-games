import { motion } from 'framer-motion';

// ─── Types & Storage ─────────────────────────────────────────────────────────

export interface GameStats {
  totalGamesPlayed: number;
  totalWins: number;
  totalGroupsFormed: number;
  perfectGames: number;
  maxStreak: number;
  highestLevel: number;
  fastCompletions: number;
  totalTimeSec: number;
  highestScore: number;
  totalWordsGrouped: number;
}

const STORAGE_KEY = 'memory-groups-stats';

function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    totalGamesPlayed: 0,
    totalWins: 0,
    totalGroupsFormed: 0,
    perfectGames: 0,
    maxStreak: 0,
    highestLevel: 0,
    fastCompletions: 0,
    totalTimeSec: 0,
    highestScore: 0,
    totalWordsGrouped: 0,
  };
}

function saveStats(stats: GameStats): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function getStats(): GameStats {
  return loadStats();
}

export function updateStats(updates: Partial<{
  gamesPlayed: number;
  wins: number;
  addGroups: number;
  perfectGames: number;
  maxStreak: number;
  highestLevel: number;
  fastCompletions: number;
  addTime: number;
  highestScore: number;
  addWords: number;
}>): GameStats {
  const stats = loadStats();
  if (updates.gamesPlayed !== undefined) stats.totalGamesPlayed = updates.gamesPlayed;
  if (updates.wins !== undefined) stats.totalWins = updates.wins;
  if (updates.addGroups !== undefined) stats.totalGroupsFormed += updates.addGroups;
  if (updates.perfectGames !== undefined) stats.perfectGames = Math.max(stats.perfectGames, updates.perfectGames);
  if (updates.maxStreak !== undefined) stats.maxStreak = Math.max(stats.maxStreak, updates.maxStreak);
  if (updates.highestLevel !== undefined) stats.highestLevel = Math.max(stats.highestLevel, updates.highestLevel);
  if (updates.fastCompletions !== undefined) stats.fastCompletions = Math.max(stats.fastCompletions, updates.fastCompletions);
  if (updates.addTime !== undefined) stats.totalTimeSec += updates.addTime;
  if (updates.highestScore !== undefined) stats.highestScore = Math.max(stats.highestScore, updates.highestScore);
  if (updates.addWords !== undefined) stats.totalWordsGrouped += updates.addWords;
  saveStats(stats);
  return stats;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface StatsScreenProps {
  readonly onBack: () => void;
}

const STAT_DISPLAY = [
  { key: 'totalGamesPlayed', label: 'Games Played', icon: '🎮' },
  { key: 'totalWins', label: 'Games Won', icon: '✅' },
  { key: 'totalGroupsFormed', label: 'Groups Formed', icon: '📝' },
  { key: 'totalWordsGrouped', label: 'Words Grouped', icon: '🔤' },
  { key: 'perfectGames', label: 'Perfect Games', icon: '💎' },
  { key: 'maxStreak', label: 'Best Streak', icon: '🔥' },
  { key: 'highestLevel', label: 'Highest Level', icon: '⭐' },
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
    <div className="flex flex-col min-h-screen p-6">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-white transition-colors">
          ← Back
        </button>
        <h2 className="text-lg font-bold text-white">Statistics</h2>
        <div className="w-12" />
      </div>

      <div className="flex-1 overflow-y-auto flex justify-center">
        <div className="grid grid-cols-2 gap-3 max-w-sm w-full content-start">
          {STAT_DISPLAY.map((stat, i) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-gray-700/40 bg-gray-800/60 p-4 text-center"
            >
              <div className="text-xl mb-1">{stat.icon}</div>
              <p className="text-lg font-bold text-white">
                {formatValue((stats as Record<string, number>)[stat.key] ?? 0, stat.format)}
              </p>
              <p className="text-[11px] text-gray-400">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
