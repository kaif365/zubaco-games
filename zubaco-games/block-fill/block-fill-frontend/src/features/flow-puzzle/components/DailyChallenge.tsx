import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiGet } from '@/app/api/apiClient';
import { API_ENDPOINTS } from '@/app/api/endpoints';

interface DailyChallengeProps {
  onPlay: (level: number) => void;
  onBack: () => void;
}

const STORAGE_KEY = 'blockfill_daily';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DailyState {
  lastCompleted: string | null;
  currentStreak: number;
  bestStreak: number;
  weekCompleted: boolean[];
}

interface DailyChallengeResponse {
  date: string;
  seed: number;
  level: number;
  bonusMultiplier: number;
}

function loadDaily(): DailyState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { lastCompleted: null, currentStreak: 0, bestStreak: 0, weekCompleted: Array(7).fill(false) };
}

function todayKey(): string {
  return new Date().toISOString().split('T')[0];
}

export function isDailyCompleted(): boolean {
  const state = loadDaily();
  return state.lastCompleted === todayKey();
}

export function markDailyComplete(): void {
  const state = loadDaily();
  const today = todayKey();
  if (state.lastCompleted === today) return;
  state.lastCompleted = today;
  state.currentStreak += 1;
  state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
  const dow = new Date().getDay();
  state.weekCompleted[dow] = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function DailyChallenge({ onPlay, onBack }: DailyChallengeProps) {
  const [state] = useState<DailyState>(loadDaily);
  const [serverDaily, setServerDaily] = useState<DailyChallengeResponse | null>(null);
  const today = new Date().getDay();
  const completedToday = state.lastCompleted === todayKey();

  useEffect(() => {
    apiGet<DailyChallengeResponse>({ path: API_ENDPOINTS.game.dailyChallenge })
      .then(setServerDaily)
      .catch(() => { /* fallback to local level calc */ });
  }, []);

  const dailyLevel = serverDaily?.level ?? ((new Date().getDay() === 0 ? 7 : Math.min(new Date().getDay() + 2, 9)));

  return (
    <motion.div
      className="flex flex-col items-center min-h-screen px-6 py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="w-full max-w-sm">
        <button onClick={onBack} className="text-gray-400 hover:text-white mb-4 text-sm">
          ← Back
        </button>

        <h2 className="text-2xl font-bold text-white text-center">Daily Challenge</h2>
        <p className="text-gray-400 text-sm text-center mt-1 mb-6">Solve today's puzzle!</p>

        {/* Week calendar */}
        <div className="flex justify-between mb-6">
          {DAYS.map((day, i) => (
            <motion.div
              key={day}
              className="flex flex-col items-center gap-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <span className="text-[10px] text-gray-500 uppercase">{day}</span>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === today
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                    : state.weekCompleted[i]
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-500'
                }`}
              >
                {state.weekCompleted[i] ? '✓' : i === today ? '▶' : '·'}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Streaks */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">{state.currentStreak}</div>
            <div className="text-xs text-gray-400 mt-1">Current Streak</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{state.bestStreak}</div>
            <div className="text-xs text-gray-400 mt-1">Best Streak</div>
          </div>
        </div>

        {/* Start button */}
        <motion.button
          onClick={() => onPlay(dailyLevel)}
          disabled={completedToday}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
            completedToday
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500'
          }`}
          whileTap={!completedToday ? { scale: 0.97 } : undefined}
        >
          {completedToday ? '✓ Completed Today' : 'Start Daily Challenge'}
        </motion.button>
      </div>
    </motion.div>
  );
}
