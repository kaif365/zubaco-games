import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Stats {
  gamesPlayed: number;
  totalCorrect: number;
  totalWrong: number;
  totalMissed: number;
  bestStreak: number;
  highScore: number;
  avgAccuracy: number;
  totalTimePlayed: number;
  perfectGames: number;
  highestLevel: number;
  recentScores: number[];
}

interface StatsScreenProps {
  onBack: () => void;
}

const STORAGE_KEY = 'rapid-sort-stats';

function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) return parsed as Stats;
    }
  } catch {}
  return {
    gamesPlayed: 0,
    totalCorrect: 0,
    totalWrong: 0,
    totalMissed: 0,
    bestStreak: 0,
    highScore: 0,
    avgAccuracy: 0,
    totalTimePlayed: 0,
    perfectGames: 0,
    highestLevel: 0,
      recentScores: [],
  };
}

function formatTime(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export function StatsScreen({ onBack }: StatsScreenProps) {
  const [stats] = useState<Stats>(loadStats);

  const statCards = [
    { label: 'Games Played', value: stats.gamesPlayed.toLocaleString(), icon: '🎮' },
    { label: 'Total Correct', value: stats.totalCorrect.toLocaleString(), icon: '✅' },
    { label: 'Total Wrong', value: stats.totalWrong.toLocaleString(), icon: '❌' },
    { label: 'Total Missed', value: stats.totalMissed.toLocaleString(), icon: '⏭️' },
    { label: 'Best Streak', value: stats.bestStreak.toLocaleString(), icon: '🔥' },
    { label: 'High Score', value: stats.highScore.toLocaleString(), icon: '🏅' },
    { label: 'Avg Accuracy', value: `${Math.round(stats.avgAccuracy)}%`, icon: '🎯' },
    { label: 'Time Played', value: formatTime(stats.totalTimePlayed), icon: '⏱️' },
    { label: 'Perfect Games', value: stats.perfectGames.toLocaleString(), icon: '💎' },
    { label: 'Highest Level', value: stats.highestLevel.toString(), icon: '📊' },
  ];

  return (
    <div className="min-h-screen flex flex-col p-6 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-6 self-start">
        ← Back
      </button>

      <h2 className="text-2xl font-bold text-white text-center mb-6">Statistics</h2>

      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto w-full">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            className="p-4 rounded-xl bg-white/5 text-center"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
          >
            <div className="text-2xl mb-1">{card.icon}</div>
            <div className="text-lg font-bold text-white">{card.value}</div>
            <div className="text-xs text-gray-400">{card.label}</div>
          </motion.div>
        ))}
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

export function updateStats(correctCount: number, wrongCount: number, missedCount: number, streak: number, score: number, timeMs: number, level: number) {
  const stats = loadStats();
  stats.gamesPlayed += 1;
  stats.totalCorrect += correctCount;
  stats.totalWrong += wrongCount;
  stats.totalMissed += missedCount;
  stats.bestStreak = Math.max(stats.bestStreak, streak);
  stats.highScore = Math.max(stats.highScore, score);
  stats.totalTimePlayed += timeMs;
  stats.highestLevel = Math.max(stats.highestLevel, level);

  const totalAttempts = stats.totalCorrect + stats.totalWrong + stats.totalMissed;
  stats.avgAccuracy = totalAttempts > 0 ? (stats.totalCorrect / totalAttempts) * 100 : 0;

  if (wrongCount === 0 && missedCount === 0) stats.perfectGames += 1;

  stats.recentScores = [score, ...(stats.recentScores || [])].slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}
