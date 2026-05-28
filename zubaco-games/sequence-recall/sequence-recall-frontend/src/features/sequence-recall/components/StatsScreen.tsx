import { useState } from 'react';
import { motion } from 'framer-motion';

interface Stats {
  gamesPlayed: number;
  bestRound: number;
  totalRounds: number;
  avgRounds: number;
  bestStreak: number;
  highScore: number;
  perfectGames: number;
  totalTimePlayed: number;
  highestLevel: number;
  longestSequence: number;
}

interface StatsScreenProps {
  onBack: () => void;
}

const STORAGE_KEY = 'sequence-recall-stats';

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
    bestRound: 0,
    totalRounds: 0,
    avgRounds: 0,
    bestStreak: 0,
    highScore: 0,
    perfectGames: 0,
    totalTimePlayed: 0,
    highestLevel: 0,
    longestSequence: 0,
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
    { label: 'Best Round', value: stats.bestRound.toLocaleString(), icon: '🏅' },
    { label: 'Total Rounds', value: stats.totalRounds.toLocaleString(), icon: '🔄' },
    { label: 'Avg Rounds', value: stats.gamesPlayed > 0 ? Math.round(stats.totalRounds / stats.gamesPlayed).toString() : '0', icon: '📊' },
    { label: 'Best Streak', value: stats.bestStreak.toLocaleString(), icon: '🔥' },
    { label: 'High Score', value: stats.highScore.toLocaleString(), icon: '⭐' },
    { label: 'Perfect Games', value: stats.perfectGames.toLocaleString(), icon: '💎' },
    { label: 'Time Played', value: formatTime(stats.totalTimePlayed), icon: '⏱️' },
    { label: 'Highest Level', value: stats.highestLevel.toString(), icon: '📈' },
    { label: 'Longest Sequence', value: stats.longestSequence.toString(), icon: '🧠' },
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
    </div>
  );
}

export function updateStats(roundsCompleted: number, streak: number, score: number, timeMs: number, level: number, seqLength: number, perfect: boolean) {
  const stats = loadStats();
  stats.gamesPlayed += 1;
  stats.totalRounds += roundsCompleted;
  stats.bestRound = Math.max(stats.bestRound, roundsCompleted);
  stats.bestStreak = Math.max(stats.bestStreak, streak);
  stats.highScore = Math.max(stats.highScore, score);
  stats.totalTimePlayed += timeMs;
  stats.highestLevel = Math.max(stats.highestLevel, level);
  stats.longestSequence = Math.max(stats.longestSequence, seqLength);
  if (perfect) stats.perfectGames += 1;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}
