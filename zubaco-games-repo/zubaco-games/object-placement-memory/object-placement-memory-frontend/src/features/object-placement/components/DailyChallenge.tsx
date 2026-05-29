import { useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onPlay: () => void;
  onBack: () => void;
}

const STORAGE_KEY = 'object-placement-daily';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DailyData {
  completedDates: string[];
  currentStreak: number;
  bestStreak: number;
}

function loadDaily(): DailyData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { completedDates: [], currentStreak: 0, bestStreak: 0 };
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function markDailyComplete() {
  const data = loadDaily();
  const today = todayStr();
  if (data.completedDates.includes(today)) return;
  data.completedDates.push(today);
  data.currentStreak += 1;
  data.bestStreak = Math.max(data.bestStreak, data.currentStreak);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function DailyChallenge({ onPlay, onBack }: Props) {
  const [daily] = useState<DailyData>(loadDaily);
  const today = todayStr();
  const completedToday = daily.completedDates.includes(today);

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  return (
    <div className="flex flex-col items-center min-h-screen px-6 py-8 gap-6">
      <div className="flex items-center w-full max-w-sm">
        <button onClick={onBack} className="text-gray-400 hover:text-white font-bold">← Back</button>
        <h2 className="flex-1 text-center text-2xl font-bold">Daily Challenge</h2>
        <div className="w-12" />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-5">
        {/* Calendar Week */}
        <div className="grid grid-cols-7 gap-2">
          {week.map((date, i) => {
            const isToday = date === today;
            const done = daily.completedDates.includes(date);
            return (
              <div key={date} className={`flex flex-col items-center p-2 rounded-lg ${isToday ? 'border-2 border-indigo-500 bg-indigo-900/30' : 'bg-gray-800'}`}>
                <span className="text-[10px] text-gray-400">{DAYS[i]}</span>
                <span className={`text-lg font-bold ${done ? 'text-green-400' : 'text-gray-500'}`}>{done ? '✓' : '○'}</span>
              </div>
            );
          })}
        </div>

        {/* Streak */}
        <div className="flex justify-around bg-gray-800 rounded-xl px-4 py-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-400">{daily.currentStreak}</p>
            <p className="text-xs text-gray-400">Current Streak</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">{daily.bestStreak}</p>
            <p className="text-xs text-gray-400">Best Streak</p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-gray-800 rounded-xl px-4 py-3 text-center">
          <p className="text-sm text-gray-300">Score multiplier: <span className="text-yellow-400 font-bold">1.5×</span></p>
          <p className="text-xs text-gray-500 mt-1">Place objects from memory for bonus points</p>
        </div>

        {/* Play */}
        <button onClick={onPlay} disabled={completedToday}
          className={`w-full py-3.5 rounded-xl font-bold text-lg shadow-lg transition-colors
            ${completedToday ? 'bg-gray-700 text-gray-400' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
          {completedToday ? '✓ Completed Today' : 'Start Daily Placement'}
        </button>
      </motion.div>
    </div>
  );
}
