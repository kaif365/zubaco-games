import { useState } from 'react';
import { motion } from 'framer-motion';

interface StatsScreenProps {
  onBack: () => void;
}

const STORAGE_KEY = 'tfblitz_stats';

interface GameStats {
  gamesPlayed: number;
  totalCorrect: number;
  totalWrong: number;
  totalMissed: number;
  highScore: number;
  bestStreak: number;
  totalStatementsAnswered: number;
  avgAccuracy: number;
  totalStreakBonus: number;
  fastestGame: number;
}

function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    gamesPlayed: 0,
    totalCorrect: 0,
    totalWrong: 0,
    totalMissed: 0,
    highScore: 0,
    bestStreak: 0,
    totalStatementsAnswered: 0,
    avgAccuracy: 0,
    totalStreakBonus: 0,
    fastestGame: 0,
  };
}

export function StatsScreen({ onBack }: StatsScreenProps) {
  const [stats] = useState<GameStats>(loadStats);

  const statItems = [
    { label: 'Games Played', value: stats.gamesPlayed, color: 'text-indigo-400' },
    { label: 'High Score', value: stats.highScore, color: 'text-yellow-400' },
    { label: 'Total Correct', value: stats.totalCorrect, color: 'text-green-400' },
    { label: 'Total Wrong', value: stats.totalWrong, color: 'text-red-400' },
    { label: 'Total Missed', value: stats.totalMissed, color: 'text-orange-400' },
    { label: 'Best Streak', value: stats.bestStreak, color: 'text-amber-400' },
    { label: 'Statements Answered', value: stats.totalStatementsAnswered, color: 'text-cyan-400' },
    { label: 'Accuracy', value: `${stats.avgAccuracy}%`, color: 'text-emerald-400' },
    { label: 'Streak Bonus (total)', value: `+${stats.totalStreakBonus}`, color: 'text-purple-400' },
    { label: 'Fastest Game', value: stats.fastestGame ? `${stats.fastestGame}s` : '—', color: 'text-pink-400' },
  ];

  return (
    <motion.div
      className="flex flex-col items-center min-h-screen px-6 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="w-full max-w-sm">
        <button onClick={onBack} className="text-gray-400 hover:text-white mb-4 text-sm">
          ← Back
        </button>

        <h2 className="text-2xl font-bold text-white text-center mb-6">Statistics</h2>

        <div className="grid grid-cols-2 gap-3">
          {statItems.map((item, i) => (
            <motion.div
              key={item.label}
              className="bg-gray-800 rounded-xl p-4 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
              <div className="text-xs text-gray-400 mt-1">{item.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
