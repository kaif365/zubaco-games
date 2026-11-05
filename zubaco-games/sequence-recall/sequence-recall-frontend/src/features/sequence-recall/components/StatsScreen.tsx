import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Gamepad2,
  Medal,
  RotateCw,
  BarChart2,
  Flame,
  Star,
  Sparkles,
  Clock,
  TrendingUp,
  Brain,
  ArrowLeft,
} from 'lucide-react';

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
  recentScores: number[];
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
    recentScores: [],
  };
}

function formatTime(ms: number): string {
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
    { label: 'Games Played', value: stats.gamesPlayed.toLocaleString(), icon: Gamepad2, color: 'text-indigo-400' },
    { label: 'Best Round', value: stats.bestRound.toLocaleString(), icon: Medal, color: 'text-amber-400' },
    { label: 'Total Rounds', value: stats.totalRounds.toLocaleString(), icon: RotateCw, color: 'text-cyan-400' },
    {
      label: 'Avg Rounds',
      value: stats.gamesPlayed > 0 ? Math.round(stats.totalRounds / stats.gamesPlayed).toString() : '0',
      icon: BarChart2,
      color: 'text-emerald-400',
    },
    { label: 'Best Streak', value: stats.bestStreak.toLocaleString(), icon: Flame, color: 'text-rose-400' },
    { label: 'High Score', value: stats.highScore.toLocaleString(), icon: Star, color: 'text-yellow-400' },
    { label: 'Perfect Games', value: stats.perfectGames.toLocaleString(), icon: Sparkles, color: 'text-purple-400' },
    { label: 'Time Played', value: formatTime(stats.totalTimePlayed), icon: Clock, color: 'text-blue-400' },
    { label: 'Highest Level', value: stats.highestLevel.toString(), icon: TrendingUp, color: 'text-teal-400' },
    { label: 'Longest Sequence', value: stats.longestSequence.toString(), icon: Brain, color: 'text-pink-400' },
  ];

  return (
    <div className="min-h-screen flex flex-col p-6 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 self-start transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <h2 className="text-2xl font-bold text-white text-center mb-6">Statistics</h2>

      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto w-full">
        {statCards.map((card, i) => {
          const IconComponent = card.icon;
          return (
            <motion.div
              key={card.label}
              className="p-4 rounded-xl bg-white/5 border border-white/5 text-center flex flex-col items-center justify-center"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
            >
              <div className={`mb-1.5 ${card.color}`}>
                <IconComponent size={22} />
              </div>
              <div className="text-lg font-bold text-white">{card.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{card.label}</div>
            </motion.div>
          );
        })}
      </div>

      {stats.recentScores && stats.recentScores.length > 1 && (
        <div className="p-4 bg-gray-800/60 rounded-xl border border-gray-700/50 max-w-sm mx-auto w-full mt-4">
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

export function updateStats(
  roundsCompleted: number,
  streak: number,
  score: number,
  timeMs: number,
  level: number,
  seqLength: number,
  perfect: boolean,
) {
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

  stats.recentScores = [score, ...(stats.recentScores || [])].slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}
