import { useState } from 'react';
import { motion } from 'framer-motion';

interface AchievementsProps {
  onClose: () => void;
}

interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_solve', icon: '🏆', title: 'First Solve', description: 'Complete your first puzzle' },
  { id: 'speed_fill', icon: '⚡', title: 'Speed Fill', description: 'Solve a puzzle in under 30 seconds' },
  { id: 'no_hints', icon: '🧠', title: 'No Hints', description: 'Solve without using any hints' },
  { id: 'streak_3', icon: '🔥', title: 'On Fire', description: 'Solve 3 puzzles in a row' },
  { id: 'streak_7', icon: '⚡', title: 'Unstoppable', description: 'Win 7 games in a row' },
  { id: 'all_easy', icon: '🌟', title: 'Easy Master', description: 'Complete all easy levels' },
  { id: 'all_hard', icon: '👑', title: 'Hard Master', description: 'Complete all hard levels' },
  { id: 'daily_7', icon: '📅', title: 'Weekly Warrior', description: 'Complete 7 daily challenges' },
  { id: 'perfect_fill', icon: '💎', title: 'Perfect Fill', description: 'Fill board with zero wrong moves' },
  { id: 'total_50', icon: '🎯', title: 'Puzzle Veteran', description: 'Solve 50 puzzles total' },
];

const STORAGE_KEY = 'blockfill_achievements';

function loadUnlocked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

export function unlockAchievement(id: string): boolean {
  const unlocked = loadUnlocked();
  if (unlocked.has(id)) return false;
  unlocked.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlocked]));
  return true;
}

export function Achievements({ onClose }: AchievementsProps) {
  const [unlocked] = useState<Set<string>>(loadUnlocked);
  const unlockedCount = unlocked.size;

  const achievements = ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: unlocked.has(a.id),
  }));

  return (
    <motion.div
      className="flex flex-col gap-4 px-4 py-6 w-full max-w-sm mx-auto min-h-[100dvh] justify-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Achievements</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="text-sm text-gray-400">
        {unlockedCount}/{achievements.length} unlocked
      </div>

      <div className="flex flex-col gap-2 max-h-[60dvh] overflow-y-auto">
        {achievements.map((ach, idx) => (
          <motion.div
            key={ach.id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all
              ${ach.unlocked
                ? 'bg-gray-800/80 border-gray-600'
                : 'bg-gray-900/40 border-gray-700/50 opacity-60'
              }`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <div className={`text-2xl ${ach.unlocked ? '' : 'grayscale'}`}>
              {ach.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${ach.unlocked ? 'text-white' : 'text-gray-500'}`}>
                {ach.title}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {ach.description}
              </div>
            </div>
            {ach.unlocked && (
              <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </motion.div>
        ))}
      </div>

      <button
        onClick={onClose}
        className="mt-2 w-full py-3 rounded-xl bg-gray-700/60 text-sm font-medium text-gray-300 hover:bg-gray-600/60 transition-colors"
      >
        Close
      </button>
    </motion.div>
  );
}
