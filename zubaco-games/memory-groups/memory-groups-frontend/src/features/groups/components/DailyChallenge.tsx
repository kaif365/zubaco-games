import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDailySeed(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getWeekDays(): { label: string; dateStr: string; isToday: boolean }[] {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const days: { label: string; dateStr: string; isToday: boolean }[] = [];
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ label: dayNames[i], dateStr, isToday: dateStr === getDailySeed() });
  }
  return days;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'memory-groups-daily';

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

function saveDaily(data: DailyData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function markDailyComplete(): void {
  const data = loadDaily();
  const today = getDailySeed();
  if (data.completedDates.includes(today)) return;
  data.completedDates.push(today);
  data.currentStreak += 1;
  data.bestStreak = Math.max(data.bestStreak, data.currentStreak);
  saveDaily(data);
}

export function isDailyCompleted(): boolean {
  return loadDaily().completedDates.includes(getDailySeed());
}

export function getDailySeedValue(): string {
  return getDailySeed();
}

// ─── Component ───────────────────────────────────────────────────────────────

interface DailyChallengeProps {
  readonly onPlay: () => void;
  readonly onBack: () => void;
}

export function DailyChallenge({ onPlay, onBack }: DailyChallengeProps) {
  const [daily] = useState(loadDaily);
  const weekDays = useMemo(getWeekDays, []);
  const completed = daily.completedDates.includes(getDailySeed());

  return (
    <div className="flex flex-col min-h-screen p-6">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-white transition-colors">
          ← Back
        </button>
        <h2 className="text-lg font-bold text-white">Daily Challenge</h2>
        <div className="w-12" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
        {/* Calendar Week */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 w-full"
        >
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const isDone = daily.completedDates.includes(day.dateStr);
              return (
                <div
                  key={day.dateStr}
                  className={`flex flex-col items-center rounded-xl py-3 ${
                    day.isToday
                      ? 'border-2 border-indigo-500 bg-gray-800'
                      : 'border border-gray-700/40 bg-gray-800/50'
                  }`}
                >
                  <span className="text-[10px] text-gray-400 mb-1">{day.label}</span>
                  <span className={`text-sm ${isDone ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {isDone ? '✓' : '○'}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Streak */}
        <div className="mb-8 flex gap-10 text-center">
          <div>
            <p className="text-2xl font-bold text-white">{daily.currentStreak}</p>
            <p className="text-xs text-gray-400">Current Streak</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-400">{daily.bestStreak}</p>
            <p className="text-xs text-gray-400">Best Streak</p>
          </div>
        </div>

        {/* Info */}
        <div className="mb-6 text-center">
          <p className="text-sm text-gray-300">Today's word groups use a unique seed</p>
          <p className="text-xs text-indigo-400 mt-1">1.5× score multiplier</p>
        </div>

        {/* Play Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onPlay}
          disabled={completed}
          className={`w-full max-w-xs rounded-xl py-4 font-bold text-white shadow-lg transition-all ${
            completed
              ? 'bg-gray-700 opacity-60 cursor-default'
              : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.97]'
          }`}
        >
          {completed ? '✓ Completed Today' : 'Start Daily Groups'}
        </motion.button>
      </div>
    </div>
  );
}
