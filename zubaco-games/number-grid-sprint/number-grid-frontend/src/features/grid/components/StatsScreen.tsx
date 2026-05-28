import { useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onBack: () => void;
}

const STORAGE_KEY = 'number-grid-stats';

export interface GridStats {
  gamesPlayed: number;
  gamesWon: number;
  totalCorrect: number;
  totalCells: number;
  perfectGames: number;
  bestStreak: number;
  highestLevel: number;
  fastGames: number;
  totalTimeSec: number;
  highScore: number;
}

function loadStats(): GridStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { gamesPlayed: 0, gamesWon: 0, totalCorrect: 0, totalCells: 0, perfectGames: 0, bestStreak: 0, highestLevel: 0, fastGames: 0, totalTimeSec: 0, highScore: 0 };
}

export function updateStats(patch: Partial<GridStats> & { addTimeSec?: number }) {
  const stats = loadStats();
  const { addTimeSec, ...rest } = patch;
  Object.assign(stats, rest);
  if (addTimeSec) stats.totalTimeSec += addTimeSec;
  stats.highScore = Math.max(stats.highScore, rest.highScore ?? 0);
  stats.bestStreak = Math.max(stats.bestStreak, rest.bestStreak ?? 0);
  stats.highestLevel = Math.max(stats.highestLevel, rest.highestLevel ?? 0);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function StatsScreen({ onBack }: Props) {
  const [stats] = useState<GridStats>(loadStats);

  const formatTime = (sec: number) => {
    if (sec < 60) return '0m';
    if (sec < 3600) return `${Math.floor(sec / 60)}m`;
    return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
  };

  const accuracy = stats.totalCells > 0 ? Math.round((stats.totalCorrect / stats.totalCells) * 100) : 0;

  const items = [
    { label: 'Games Played', value: stats.gamesPlayed.toLocaleString(), icon: '🎮' },
    { label: 'Games Won', value: stats.gamesWon.toLocaleString(), icon: '✅' },
    { label: 'Accuracy', value: `${accuracy}%`, icon: '🎯' },
    { label: 'Correct Cells', value: stats.totalCorrect.toLocaleString(), icon: '✓' },
    { label: 'Perfect Games', value: stats.perfectGames.toLocaleString(), icon: '💎' },
    { label: 'Best Streak', value: stats.bestStreak.toLocaleString(), icon: '🔥' },
    { label: 'Highest Level', value: stats.highestLevel.toLocaleString(), icon: '⭐' },
    { label: 'Speed Runs', value: stats.fastGames.toLocaleString(), icon: '⚡' },
    { label: 'Total Time', value: formatTime(stats.totalTimeSec), icon: '⏱️' },
    { label: 'High Score', value: stats.highScore.toLocaleString(), icon: '🏅' },
  ];

  return (
    <div className="flex flex-col items-center min-h-screen px-6 py-8 gap-6">
      <div className="flex items-center w-full max-w-sm">
        <button onClick={onBack} className="text-gray-400 hover:text-white font-bold">← Back</button>
        <h2 className="flex-1 text-center text-2xl font-bold">Statistics</h2>
        <div className="w-12" />
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {items.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-gray-800 rounded-xl p-3 text-center"
          >
            <span className="text-2xl">{item.icon}</span>
            <p className="text-lg font-bold mt-1">{item.value}</p>
            <p className="text-xs text-gray-400">{item.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
