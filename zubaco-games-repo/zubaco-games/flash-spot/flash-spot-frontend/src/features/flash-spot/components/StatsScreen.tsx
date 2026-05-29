import { useState } from 'react';
import { motion } from 'framer-motion';

const STATS_KEY = 'zubaco_flash_spot_stats';

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  highScore: number;
  highestLevel: number;
  totalCorrectTaps: number;
  totalWrongTaps: number;
  bestStreak: number;
  bestAccuracy: number;
  recentScores: number[];
}

function loadStats(): PlayerStats {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY) || 'null') || getDefault();
  } catch { return getDefault(); }
}

function getDefault(): PlayerStats {
  return {
    gamesPlayed: 0, wins: 0, highScore: 0, highestLevel: 0,
    totalCorrectTaps: 0, totalWrongTaps: 0, bestStreak: 0, bestAccuracy: 0,
    recentScores: [],
  };
}

export function updateStats(update: {
  score: number; level: number; correctTaps: number;
  wrongTaps: number; streak: number; accuracy: number; won: boolean;
}): void {
  const stats = loadStats();
  stats.gamesPlayed++;
  if (update.won) stats.wins++;
  stats.highScore = Math.max(stats.highScore, update.score);
  stats.highestLevel = Math.max(stats.highestLevel, update.level);
  stats.totalCorrectTaps += update.correctTaps;
  stats.totalWrongTaps += update.wrongTaps;
  stats.bestStreak = Math.max(stats.bestStreak, update.streak);
  stats.bestAccuracy = Math.max(stats.bestAccuracy, update.accuracy);
  stats.recentScores = [...stats.recentScores, update.score].slice(-15);
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

interface StatsScreenProps {
  onClose: () => void;
}

export function StatsScreen({ onClose }: StatsScreenProps) {
  const [stats] = useState(loadStats);

  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
  const totalTaps = stats.totalCorrectTaps + stats.totalWrongTaps;
  const overallAccuracy = totalTaps > 0 ? Math.round((stats.totalCorrectTaps / totalTaps) * 100) : 0;

  const statCards = [
    { icon: '🎮', label: 'Games Played', value: stats.gamesPlayed },
    { icon: '🏆', label: 'Wins', value: stats.wins },
    { icon: '📈', label: 'Win Rate', value: `${winRate}%` },
    { icon: '⭐', label: 'High Score', value: stats.highScore },
    { icon: '📊', label: 'Highest Level', value: stats.highestLevel || '-' },
    { icon: '🔥', label: 'Best Streak', value: stats.bestStreak },
    { icon: '🎯', label: 'Best Accuracy', value: `${Math.round(stats.bestAccuracy * 100)}%` },
    { icon: '👆', label: 'Overall Accuracy', value: `${overallAccuracy}%` },
  ];

  const maxScore = Math.max(...stats.recentScores, 1);

  return (
    <div className="flex h-screen flex-col bg-game-bg px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Statistics</h2>
        <button onClick={onClose} className="text-sm text-gray-400 hover:text-white">Close</button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {statCards.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl bg-white/5 p-3 text-center"
          >
            <div className="text-lg">{s.icon}</div>
            <div className="text-lg font-bold text-white">{s.value}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {stats.recentScores.length > 1 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-medium text-gray-300">Recent Scores</h3>
          <div className="flex items-end gap-1 h-20">
            {stats.recentScores.map((score, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-game-accent/60"
                style={{ height: `${(score / maxScore) * 100}%` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
