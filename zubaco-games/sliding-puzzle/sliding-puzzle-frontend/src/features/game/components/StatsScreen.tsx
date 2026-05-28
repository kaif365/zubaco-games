import { useState } from 'react';
import { motion } from 'framer-motion';

interface Stats {
  gamesPlayed: number;
  puzzlesSolved: number;
  totalMoves: number;
  avgMoves: number;
  bestTime: number;
  highScore: number;
  totalTimePlayed: number;
  fastestSolve: number;
  perfectSolves: number;
  highestLevel: number;
}

interface StatsScreenProps {
  onBack: () => void;
}

const STORAGE_KEY = 'sliding-puzzle-stats';

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
    puzzlesSolved: 0,
    totalMoves: 0,
    avgMoves: 0,
    bestTime: 0,
    highScore: 0,
    totalTimePlayed: 0,
    fastestSolve: 0,
    perfectSolves: 0,
    highestLevel: 0,
  };
}

function formatTime(ms: number): string {
  if (ms === 0) return '—';
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export function StatsScreen({ onBack }: StatsScreenProps) {
  const [stats] = useState<Stats>(loadStats);

  const statCards = [
    { label: 'Games Played', value: stats.gamesPlayed.toLocaleString(), icon: '🎮' },
    { label: 'Puzzles Solved', value: stats.puzzlesSolved.toLocaleString(), icon: '✅' },
    { label: 'Total Moves', value: stats.totalMoves.toLocaleString(), icon: '👆' },
    { label: 'Avg Moves/Puzzle', value: stats.puzzlesSolved > 0 ? Math.round(stats.totalMoves / stats.puzzlesSolved).toString() : '0', icon: '📊' },
    { label: 'High Score', value: stats.highScore.toLocaleString(), icon: '⭐' },
    { label: 'Fastest Solve', value: formatTime(stats.fastestSolve), icon: '⚡' },
    { label: 'Time Played', value: formatTime(stats.totalTimePlayed), icon: '⏱️' },
    { label: 'Perfect Solves', value: stats.perfectSolves.toLocaleString(), icon: '💎' },
    { label: 'Highest Level', value: stats.highestLevel.toString(), icon: '📈' },
    { label: 'Best Time', value: formatTime(stats.bestTime), icon: '🏅' },
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

export function updateStats(puzzlesSolved: number, moves: number, score: number, timeMs: number, level: number) {
  const stats = loadStats();
  stats.gamesPlayed += 1;
  stats.puzzlesSolved += puzzlesSolved;
  stats.totalMoves += moves;
  stats.highScore = Math.max(stats.highScore, score);
  stats.totalTimePlayed += timeMs;
  stats.highestLevel = Math.max(stats.highestLevel, level);
  if (timeMs > 0 && (stats.fastestSolve === 0 || timeMs < stats.fastestSolve)) {
    stats.fastestSolve = timeMs;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}
