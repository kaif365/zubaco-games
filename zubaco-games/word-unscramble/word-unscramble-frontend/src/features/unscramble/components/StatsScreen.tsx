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
  recentScores: number[];
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
    recentScores: [],
  };
}

export function updateStats(update: { score: number; wordsSolved: number; wordsAttempted: number; perfect: boolean }) {
  const stats = loadStats();
  stats.gamesPlayed++;
  stats.wordsSolved += update.wordsSolved;
  stats.wordsAttempted += update.wordsAttempted;
  stats.highScore = Math.max(stats.highScore, update.score);
  stats.totalScore += update.score;
  if (update.perfect) stats.perfectGames++;
  stats.recentScores = [update.score, ...(stats.recentScores || [])].slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
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
    </motion.div>
  );
}
