import { motion } from 'framer-motion';

const DAILY_KEY = 'zubaco_flash_spot_daily';

interface DailyState {
  date: string;
  completed: boolean;
  score: number;
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDailyState(): DailyState | null {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as DailyState;
    return state.date === getTodayStr() ? state : null;
  } catch { return null; }
}

export function isDailyCompleted(): boolean {
  return getDailyState()?.completed === true;
}

export function completeDailyChallenge(score: number): void {
  localStorage.setItem(DAILY_KEY, JSON.stringify({ date: getTodayStr(), completed: true, score }));
}

export function getDailyLevel(): number {
  const day = new Date().getDay(); // 0=Sun, 6=Sat
  // Mon=1 → level 2, ..., Sun=0 → level 7
  const map = [7, 1, 2, 3, 4, 5, 6];
  return map[day]!;
}

interface DailyChallengeProps {
  onPlay: (level: number) => void;
  onBack: () => void;
}

export function DailyChallenge({ onPlay, onBack }: DailyChallengeProps) {
  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const level = getDailyLevel();
  const state = getDailyState();
  const completed = state?.completed === true;

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-game-bg px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl bg-white/5 p-6 text-center"
      >
        <div className="mb-2 text-3xl">📅</div>
        <h2 className="text-xl font-bold text-white">{dayName}'s Challenge</h2>
        <p className="mt-1 text-sm text-gray-400">{dateStr}</p>

        <div className="mt-4 rounded-lg bg-white/5 p-3">
          <div className="text-sm text-gray-300">Level {level}</div>
          <div className="mt-1 text-xs text-game-accent">1.5× Score Bonus!</div>
        </div>

        {completed ? (
          <div className="mt-6">
            <div className="text-emerald-400 text-sm font-medium">✓ Completed Today!</div>
            <div className="mt-1 text-2xl font-bold text-white">{state!.score} pts</div>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onPlay(level)}
            className="mt-6 w-full rounded-xl bg-game-accent px-6 py-3 font-semibold text-white shadow-lg"
          >
            Play Daily Challenge
          </motion.button>
        )}

        <button onClick={onBack} className="mt-4 text-sm text-gray-400 hover:text-white">
          ← Back
        </button>
      </motion.div>

      <p className="mt-4 max-w-xs text-center text-xs text-gray-500">
        Difficulty increases through the week. Monday is easiest, Sunday is hardest.
      </p>
    </div>
  );
}
