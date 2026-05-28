import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';

interface DailyChallengeProps {
  onBack: () => void;
  onStartDaily: (seed: number) => void;
}

interface DailyState {
  completedDays: string[];
  currentStreak: number;
  bestStreak: number;
}

const STORAGE_KEY = 'reflex-endurance-daily';

function loadDaily(): DailyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) return parsed as DailyState;
    }
  } catch {}
  return { completedDays: [], currentStreak: 0, bestStreak: 0 };
}

function saveDaily(state: DailyState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getDateStr(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function getDailySeed(dateStr: string): number {
  let hash = 0;
  const str = `reflex-endurance:${dateStr}:daily`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

function getWeekDays(): { date: Date; dateStr: string; label: string }[] {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  const days = [];
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({ date: d, dateStr: getDateStr(d), label: labels[i] });
  }
  return days;
}

export function DailyChallenge({ onBack, onStartDaily }: DailyChallengeProps) {
  const [daily, setDaily] = useState<DailyState>(loadDaily);
  const today = getDateStr();
  const isCompletedToday = daily.completedDays.includes(today);
  const weekDays = useMemo(getWeekDays, []);

  useEffect(() => {
    saveDaily(daily);
  }, [daily]);

  const handleStart = () => {
    const seed = getDailySeed(today);
    onStartDaily(seed);
  };

  return (
    <div className="min-h-screen flex flex-col p-6 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-6 self-start">
        ← Back
      </button>

      <h2 className="text-2xl font-bold text-white text-center mb-2">Daily Challenge</h2>
      <p className="text-center text-gray-400 text-sm mb-6">Score multiplier: 1.5×</p>

      {/* Calendar Week */}
      <div className="flex justify-center gap-2 mb-8">
        {weekDays.map((wd) => {
          const completed = daily.completedDays.includes(wd.dateStr);
          const isToday = wd.dateStr === today;
          return (
            <motion.div
              key={wd.dateStr}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg min-w-[40px] ${
                isToday ? 'border-2 border-green-500 bg-green-500/10' : 'bg-white/5'
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="text-xs text-gray-400">{wd.label}</span>
              <span className={`text-lg ${completed ? 'text-emerald-400' : 'text-gray-500'}`}>
                {completed ? '✓' : '○'}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Streaks */}
      <div className="flex justify-center gap-8 mb-8">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{daily.currentStreak}</div>
          <div className="text-xs text-gray-400">Current Streak</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-amber-400">{daily.bestStreak}</div>
          <div className="text-xs text-gray-400">Best Streak</div>
        </div>
      </div>

      {/* Start Button */}
      <div className="flex justify-center">
        <motion.button
          onClick={handleStart}
          disabled={isCompletedToday}
          className={`px-8 py-3 rounded-xl font-semibold text-white shadow-lg ${
            isCompletedToday
              ? 'bg-gray-600 cursor-not-allowed opacity-60'
              : 'bg-green-600 hover:bg-green-500'
          }`}
          whileTap={isCompletedToday ? {} : { scale: 0.97 }}
        >
          {isCompletedToday ? '✓ Completed Today' : 'Start Daily Reflex'}
        </motion.button>
      </div>
    </div>
  );
}

export function markDailyComplete() {
  const daily = loadDaily();
  const today = getDateStr();
  if (daily.completedDays.includes(today)) return;

  daily.completedDays.push(today);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getDateStr(yesterday);
  if (daily.completedDays.includes(yesterdayStr)) {
    daily.currentStreak += 1;
  } else {
    daily.currentStreak = 1;
  }
  daily.bestStreak = Math.max(daily.bestStreak, daily.currentStreak);

  saveDaily(daily);
}
