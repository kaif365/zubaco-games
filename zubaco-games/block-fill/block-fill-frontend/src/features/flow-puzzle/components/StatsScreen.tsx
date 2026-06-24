import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { unlockAchievement } from './Achievements';
import { getHighestLevel } from './LevelSelector';

interface StatsData {
  gamesPlayed: number;
  gamesWon: number;
  totalTimeSec: number;
  bestTimeSec: number;
  totalMoves: number;
  currentStreak: number;
  longestStreak: number;
  recentScores: number[];
}

const STATS_KEY = 'blockfill_stats';

function loadStats(): StatsData {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    totalTimeSec: 0,
    bestTimeSec: 0,
    totalMoves: 0,
    currentStreak: 0,
    longestStreak: 0,
    recentScores: [],
  };
}

export function updateStats(update: { won: boolean; timeSec: number; moves: number; score?: number }) {
  const stats = loadStats();
  stats.gamesPlayed++;
  if (update.won) { stats.gamesWon++; stats.currentStreak++; } else { stats.currentStreak = 0; }
  stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
  stats.totalTimeSec += update.timeSec;
  if (update.won && (stats.bestTimeSec === 0 || update.timeSec < stats.bestTimeSec)) stats.bestTimeSec = update.timeSec;
  stats.totalMoves += update.moves;
  const score = update.score ?? (update.won ? Math.max(1, 1000 - update.moves * 10) : 0);
  stats.recentScores = [score, ...(stats.recentScores || [])].slice(0, 20);
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));

  // Check achievement unlocks based on updated stats
  if (stats.gamesWon >= 1) unlockAchievement('FIRST_WIN');
  if (stats.longestStreak >= 5) unlockAchievement('STREAK_5');
  if (stats.longestStreak >= 10) unlockAchievement('STREAK_10');
  if (stats.gamesPlayed >= 50) unlockAchievement('PERSISTENCE');
  if (score >= 1000) unlockAchievement('HIGH_SCORER');
  const level = getHighestLevel();
  if (level >= 5) unlockAchievement('LEVEL_5');
  if (level >= 9) unlockAchievement('LEVEL_10');
}

interface StatsScreenProps {
  onBack: () => void;
}

export function StatsScreen({ onBack }: StatsScreenProps) {
  const [stats, setStats] = useState<StatsData>(loadStats);

  useEffect(() => {
    setStats(loadStats());
  }, []);

  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  const formatTime = (sec: number) => {
    if (sec === 0) return '--';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const statItems = [
    { label: 'Games Played', value: String(stats.gamesPlayed), icon: '🎮' },
    { label: 'Games Won', value: String(stats.gamesWon), icon: '🏆' },
    { label: 'Win Rate', value: `${winRate}%`, icon: '📊' },
    { label: 'Best Time', value: formatTime(stats.bestTimeSec), icon: '⚡' },
    { label: 'Total Time', value: formatTime(stats.totalTimeSec), icon: '⏱️' },
    { label: 'Current Streak', value: String(stats.currentStreak), icon: '🔥' },
    { label: 'Longest Streak', value: String(stats.longestStreak), icon: '⭐' },
  ];

  return (
    <motion.div
      className="flex flex-col gap-4 px-4 py-6 w-full max-w-sm mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Your Stats</h2>
        <button onClick={onBack} className="text-gray-400 hover:text-white p-1 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {statItems.map((item, idx) => (
          <motion.div
            key={item.label}
            className="p-3 bg-gray-800/60 rounded-xl border border-gray-700/50"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{item.icon}</span>
              <span className="text-lg font-bold text-white">{item.value}</span>
            </div>
            <div className="text-xs text-gray-400">{item.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Recent scores chart */}
      {stats.recentScores && stats.recentScores.length > 1 && (
        <div className="p-4 bg-gray-800/60 rounded-xl border border-gray-700/50">
          <div className="text-sm font-medium text-gray-300 mb-3">Recent Scores</div>
          <div className="flex items-end gap-1 h-16">
            {stats.recentScores.slice(0, 15).map((score, idx) => {
              const max = Math.max(...stats.recentScores, 1);
              const height = Math.max(4, (score / max) * 100);
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

      <button
        onClick={onBack}
        className="mt-2 w-full py-3 rounded-xl bg-gray-700/60 text-sm font-medium text-gray-300 hover:bg-gray-600/60 transition-colors"
      >
        Close
      </button>
    </motion.div>
  );
}
