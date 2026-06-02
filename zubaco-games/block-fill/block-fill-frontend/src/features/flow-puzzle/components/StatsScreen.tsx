import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Clock, Target, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useEffect, useState } from 'react';

interface StatsData {
  gamesPlayed: number;
  gamesWon: number;
  totalTimeSec: number;
  bestTimeSec: number;
  totalMoves: number;
  currentStreak: number;
  longestStreak: number;
  recentScores: number[];
}

const STATS_KEY = 'blockfill_stats';

function loadStats(): StatsData {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    totalTimeSec: 0,
    bestTimeSec: 0,
    totalMoves: 0,
    currentStreak: 0,
    longestStreak: 0,
    recentScores: [],
  };
}

export function updateStats(update: { won: boolean; timeSec: number; moves: number }) {
  const stats = loadStats();
  stats.gamesPlayed++;
  if (update.won) { stats.gamesWon++; stats.currentStreak++; } else { stats.currentStreak = 0; }
  stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
  stats.totalTimeSec += update.timeSec;
  if (update.won && (stats.bestTimeSec === 0 || update.timeSec < stats.bestTimeSec)) stats.bestTimeSec = update.timeSec;
  stats.totalMoves += update.moves;
  // Use moves as a "score" proxy (lower is better, so invert for bar chart)
  const score = update.won ? Math.max(1, 1000 - update.moves * 10) : 0;
  stats.recentScores = [score, ...(stats.recentScores || [])].slice(0, 20);
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

interface StatsScreenProps {
  onBack: () => void;
}

export function StatsScreen({ onBack }: StatsScreenProps) {
  const [stats, setStats] = useState<StatsData>(loadStats);

  useEffect(() => {
    setStats(loadStats());
  }, []);

  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  const formatTime = (sec: number) => {
    if (sec === 0) return '--';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const statItems = [
    { icon: Target, label: 'Games Played', value: String(stats.gamesPlayed), color: 'text-cyan-300' },
    { icon: Trophy, label: 'Games Won', value: String(stats.gamesWon), color: 'text-amber-300' },
    { icon: Target, label: 'Win Rate', value: `${winRate}%`, color: 'text-mint-300' },
    { icon: Clock, label: 'Total Time', value: formatTime(stats.totalTimeSec), color: 'text-violet-300' },
    { icon: Clock, label: 'Best Time', value: formatTime(stats.bestTimeSec), color: 'text-indigo-300' },
    { icon: Flame, label: 'Current Streak', value: String(stats.currentStreak), color: 'text-orange-300' },
    { icon: Flame, label: 'Longest Streak', value: String(stats.longestStreak), color: 'text-rose-300' },
  ];

  return (
    <Card className="rounded-[2rem] border-white/12 bg-slate-950/65">
      <CardContent className="space-y-6 px-6 py-8 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Statistics</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white">
              Your Progress
            </h2>
          </div>
          <Button
            variant="ghost"
            className="rounded-full text-slate-200 hover:bg-white/8"
            onClick={onBack}
          >
            <ArrowLeft size={18} />
            Back
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {statItems.map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="flex items-center gap-4 rounded-[1.5rem] border border-white/8 bg-white/5 px-5 py-4"
            >
              <Icon size={22} className={color} />
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
                <p className="mt-1 text-xl font-semibold text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {stats.recentScores && stats.recentScores.length > 1 && (
          <div className="rounded-[1.5rem] border border-white/8 bg-white/5 px-5 py-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400 mb-3">Recent Scores</p>
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
      </CardContent>
    </Card>
  );
}
