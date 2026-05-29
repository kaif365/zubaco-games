import { motion } from 'framer-motion';

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_PREFIX = 'logic-reflector-daily';

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isDailyCompleted(): boolean {
  return localStorage.getItem(`${STORAGE_PREFIX}-${getTodayKey()}`) === 'true';
}

export function completeDailyChallenge(): void {
  localStorage.setItem(`${STORAGE_PREFIX}-${getTodayKey()}`, 'true');
}

export function getDailyLevel(): number {
  const dayOfWeek = new Date().getDay();
  return dayOfWeek === 0 ? 7 : Math.min(dayOfWeek + 2, 10);
}

function getDailyBonusMultiplier(): number {
  const level = getDailyLevel();
  return 1.5 + (level - 1) * 0.1;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface DailyChallengeProps {
  readonly onPlay: () => void;
  readonly onBack: () => void;
}

export function DailyChallenge({ onPlay, onBack }: DailyChallengeProps) {
  const completed = isDailyCompleted();
  const level = getDailyLevel();
  const bonus = getDailyBonusMultiplier();

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const key = date.toISOString().slice(0, 10);
    const dayCompleted = localStorage.getItem(`${STORAGE_PREFIX}-${key}`) === 'true';
    return {
      label: date.toLocaleDateString('en', { weekday: 'short' }),
      date: date.getDate(),
      completed: dayCompleted,
      isToday: i === 6,
    };
  });

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 p-6">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors">
          ← Back
        </button>
        <h2 className="text-lg font-bold text-white">Daily Challenge</h2>
        <div className="w-16" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
        {/* Calendar Week */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex gap-2 w-full justify-center"
        >
          {weekDays.map((day) => (
            <div
              key={day.date}
              className={`flex flex-col items-center rounded-lg p-2 min-w-[40px] ${
                day.isToday ? 'bg-slate-800 border border-purple-500/40' : ''
              }`}
            >
              <span className="text-[10px] text-slate-500 mb-1">{day.label}</span>
              <span className={`text-sm font-bold ${day.isToday ? 'text-white' : 'text-slate-400'}`}>
                {day.date}
              </span>
              <span className="mt-1 text-sm">
                {day.completed ? '✅' : day.isToday ? '🎯' : '⬜'}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Today's Challenge Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full rounded-2xl border border-amber-500/30 bg-slate-800/80 p-6 text-center"
        >
          <div className="mb-2 text-3xl">🔦</div>
          <h3 className="text-xl font-bold text-white mb-1">Today&apos;s Puzzle</h3>
          <p className="text-sm text-slate-400 mb-4">
            Difficulty Level {level} • Bonus ×{bonus.toFixed(1)}
          </p>

          {completed ? (
            <div className="rounded-xl bg-emerald-900/30 border border-emerald-500/30 p-4">
              <p className="text-emerald-400 font-semibold">✅ Completed!</p>
              <p className="text-xs text-slate-400 mt-1">Come back tomorrow for a new puzzle</p>
            </div>
          ) : (
            <button
              onClick={onPlay}
              className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-3 font-semibold text-white shadow-lg transition-transform active:scale-[0.97]"
            >
              Start Challenge
            </button>
          )}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 text-xs text-slate-500 text-center"
        >
          Daily puzzles get harder as the week progresses.
          <br />
          Complete all 7 days for bonus XP!
        </motion.p>
      </div>
    </div>
  );
}
