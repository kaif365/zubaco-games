import { useState } from 'react';
import { motion } from 'framer-motion';

interface Stats {
  gamesPlayed: number;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  highScore: number;
  avgResponseTime: number;
  fastestAnswer: number;
  totalTimePlayed: number;
  perfectGames: number;
  longestStreak: number;
  recentScores: number[];
}

interface StatsScreenProps {
  onBack: () => void;
}

const STORAGE_KEY = 'speed-type-stats';

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
    questionsAnswered: 0,
    correctAnswers: 0,
    accuracy: 0,
    highScore: 0,
    avgResponseTime: 0,
    fastestAnswer: 0,
    totalTimePlayed: 0,
    perfectGames: 0,
    longestStreak: 0,
      recentScores: [],
  };
}

function formatTime(ms: number): string {
  if (ms === 0) return '—';
  if (ms < 1000) return `${ms}ms`;
  const secs = (ms / 1000).toFixed(1);
  return `${secs}s`;
}

function formatPlayTime(ms: number): string {
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export function StatsScreen({ onBack }: StatsScreenProps) {
  const [stats] = useState<Stats>(loadStats);

  const statCards = [
    { label: 'Games Played', value: stats.gamesPlayed.toLocaleString(), icon: '🎮' },
    { label: 'Questions Answered', value: stats.questionsAnswered.toLocaleString(), icon: '❓' },
    { label: 'Correct Answers', value: stats.correctAnswers.toLocaleString(), icon: '✅' },
    { label: 'Accuracy', value: stats.questionsAnswered > 0 ? `${Math.round((stats.correctAnswers / stats.questionsAnswered) * 100)}%` : '0%', icon: '🎯' },
    { label: 'High Score', value: stats.highScore.toLocaleString(), icon: '⭐' },
    { label: 'Avg Response', value: formatTime(stats.avgResponseTime), icon: '⏱️' },
    { label: 'Fastest Answer', value: formatTime(stats.fastestAnswer), icon: '⚡' },
    { label: 'Time Played', value: formatPlayTime(stats.totalTimePlayed), icon: '🕐' },
    { label: 'Perfect Games', value: stats.perfectGames.toLocaleString(), icon: '💎' },
    { label: 'Best Streak', value: stats.longestStreak.toLocaleString(), icon: '🔥' },
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

export function updateStats(correct: number, total: number, score: number, avgResponseMs: number, fastestMs: number, timeMs: number, streak: number) {
  const stats = loadStats();
  stats.gamesPlayed += 1;
  stats.questionsAnswered += total;
  stats.correctAnswers += correct;
  stats.highScore = Math.max(stats.highScore, score);
  stats.totalTimePlayed += timeMs;
  stats.longestStreak = Math.max(stats.longestStreak, streak);
  if (fastestMs > 0 && (stats.fastestAnswer === 0 || fastestMs < stats.fastestAnswer)) {
    stats.fastestAnswer = fastestMs;
  }
  if (stats.questionsAnswered > 0) {
    stats.avgResponseTime = Math.round(
      ((stats.avgResponseTime * (stats.questionsAnswered - total)) + (avgResponseMs * total)) / stats.questionsAnswered
    );
  }
  if (correct === total && total > 0) stats.perfectGames += 1;

  stats.recentScores = [score, ...(stats.recentScores || [])].slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}
