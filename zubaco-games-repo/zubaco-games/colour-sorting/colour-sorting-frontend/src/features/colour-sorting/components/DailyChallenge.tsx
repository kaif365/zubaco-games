import { motion } from 'framer-motion';

const DAILY_KEY = 'zubaco_colour_sort_daily';

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDailySeed(): number {
  const str = `colour-sorting:${getTodayStr()}:daily`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

function getDailyLevel(): number {
  const day = new Date().getDay(); // 0=Sun
  return day === 0 ? 7 : Math.min(day + 2, 10);
}

export function isDailyCompleted(): boolean {
  try {
    const stored = localStorage.getItem(DAILY_KEY);
    if (!stored) return false;
    const data = JSON.parse(stored);
    return data.date === getTodayStr();
  } catch {
    return false;
  }
}

export function completeDailyChallenge(score: number): void {
  localStorage.setItem(DAILY_KEY, JSON.stringify({
    date: getTodayStr(),
    score,
  }));
}

export function getDailyConfig() {
  return {
    seed: getDailySeed(),
    level: getDailyLevel(),
    bonusMultiplier: 1.5,
    date: getTodayStr(),
  };
}

interface DailyChallengeProps {
  onPlay: () => void;
  onClose: () => void;
}

export function DailyChallenge({ onPlay, onClose }: DailyChallengeProps) {
  const completed = isDailyCompleted();
  const config = getDailyConfig();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = dayNames[new Date().getDay()];

  return (
    <motion.div
      className="flex flex-col items-center gap-5 px-4 py-6 w-full max-w-sm mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between w-full">
        <h2 className="text-xl font-bold text-white">Daily Challenge</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Calendar card */}
      <motion.div
        className="w-full p-6 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-2xl border border-indigo-500/30"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
      >
        <div className="text-center">
          <div className="text-xs text-indigo-300 uppercase tracking-wider mb-1">{today}'s Challenge</div>
          <div className="text-3xl font-black text-white mb-1">{config.date}</div>
          <div className="text-sm text-gray-300 mt-3">
            Level <span className="font-bold text-indigo-300">{config.level}</span> ·
            <span className="text-yellow-400 font-medium"> 1.5x bonus</span>
          </div>
        </div>
      </motion.div>

      {completed ? (
        <div className="flex flex-col items-center gap-2 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30 w-full">
          <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm font-medium text-emerald-300">Completed today!</div>
          <div className="text-xs text-gray-400">Come back tomorrow for a new challenge</div>
        </div>
      ) : (
        <motion.button
          onClick={onPlay}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-base font-semibold text-white shadow-lg transition-all hover:shadow-indigo-500/30"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Play Daily Challenge
        </motion.button>
      )}

      <div className="text-xs text-gray-500 text-center">
        Difficulty increases through the week. Sunday is the hardest!
      </div>

      <button
        onClick={onClose}
        className="text-sm text-gray-400 hover:text-white transition-colors"
      >
        ← Back
      </button>
    </motion.div>
  );
}
