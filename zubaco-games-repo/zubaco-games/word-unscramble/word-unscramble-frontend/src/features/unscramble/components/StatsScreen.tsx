import { useState } from 'react';
import { motion } from 'framer-motion';

interface StatsScreenProps {
  onBack: () => void;
}

const STORAGE_KEY = 'wordscramble_stats';

interface GameStats {
  gamesPlayed: number;
  wordsSolved: number;
  wordsAttempted: number;
  highScore: number;
  bestTimeBonus: number;
  avgSolveTime: number;
  fastestWord: number;
  longestWordSolved: number;
  totalScore: number;
  perfectGames: number;
}

function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    gamesPlayed: 0,
    wordsSolved: 0,
    wordsAttempted: 0,
    highScore: 0,
    bestTimeBonus: 0,
    avgSolveTime: 0,
    fastestWord: 0,
    longestWordSolved: 0,
    totalScore: 0,
    perfectGames: 0,
  };
}

export function StatsScreen({ onBack }: StatsScreenProps) {
  const [stats] = useState<GameStats>(loadStats);

  const statItems = [
    { label: 'Games Played', value: stats.gamesPlayed, color: 'text-indigo-400' },
    { label: 'High Score', value: stats.highScore, color: 'text-yellow-400' },
    { label: 'Words Solved', value: stats.wordsSolved, color: 'text-green-400' },
    { label: 'Words Attempted', value: stats.wordsAttempted, color: 'text-cyan-400' },
    { label: 'Best Time Bonus', value: `+${stats.bestTimeBonus}`, color: 'text-purple-400' },
    { label: 'Avg Solve Time', value: stats.avgSolveTime ? `${stats.avgSolveTime}s` : '—', color: 'text-orange-400' },
    { label: 'Fastest Word', value: stats.fastestWord ? `${stats.fastestWord}s` : '—', color: 'text-pink-400' },
    { label: 'Longest Word', value: stats.longestWordSolved ? `${stats.longestWordSolved} letters` : '—', color: 'text-amber-400' },
    { label: 'Total Score', value: stats.totalScore, color: 'text-emerald-400' },
    { label: 'Perfect Games', value: stats.perfectGames, color: 'text-red-400' },
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
