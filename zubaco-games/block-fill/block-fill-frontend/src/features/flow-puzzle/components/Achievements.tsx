import { useState } from 'react';
import { motion } from 'framer-motion';

interface AchievementsProps {
  onBack: () => void;
}

interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_solve', icon: '🎮', title: 'First Solve', description: 'Complete your first puzzle' },
  { id: 'speed_fill', icon: '⚡', title: 'Speed Fill', description: 'Solve a puzzle in under 30 seconds' },
  { id: 'no_hints', icon: '🧠', title: 'No Hints', description: 'Solve without using any hints' },
  { id: 'streak_3', icon: '🔥', title: 'On Fire', description: 'Solve 3 puzzles in a row' },
  { id: 'all_easy', icon: '🌟', title: 'Easy Master', description: 'Complete all easy levels' },
  { id: 'all_medium', icon: '💪', title: 'Medium Master', description: 'Complete all medium levels' },
  { id: 'all_hard', icon: '👑', title: 'Hard Master', description: 'Complete all hard levels' },
  { id: 'daily_7', icon: '📅', title: 'Weekly Warrior', description: 'Complete 7 daily challenges' },
  { id: 'perfect_fill', icon: '💎', title: 'Perfect Fill', description: 'Fill board with zero wrong moves' },
  { id: 'total_50', icon: '🏅', title: 'Puzzle Veteran', description: 'Solve 50 puzzles total' },
];

const STORAGE_KEY = 'blockfill_achievements';

function loadUnlocked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

export function Achievements({ onBack }: AchievementsProps) {
  const [unlocked] = useState<Set<string>>(loadUnlocked);
  const unlockedCount = unlocked.size;

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

        <h2 className="text-2xl font-bold text-white text-center">Achievements</h2>
        <p className="text-gray-400 text-sm text-center mt-1 mb-6">
          {unlockedCount} / {ACHIEVEMENTS.length} unlocked
        </p>

        <div className="space-y-3">
          {ACHIEVEMENTS.map((ach, i) => {
            const isUnlocked = unlocked.has(ach.id);
            return (
              <motion.div
                key={ach.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  isUnlocked ? 'bg-gray-800' : 'bg-gray-800/50 opacity-50'
                }`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: isUnlocked ? 1 : 0.5, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <span className="text-2xl">{ach.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">{ach.title}</div>
                  <div className="text-xs text-gray-400">{ach.description}</div>
                </div>
                {isUnlocked && <span className="text-green-400 text-sm">✓</span>}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
