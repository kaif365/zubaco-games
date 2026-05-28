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
  { id: 'first_game', icon: '🎮', title: 'First Game', description: 'Complete your first unscramble game' },
  { id: 'speed_solver', icon: '⚡', title: 'Speed Solver', description: 'Solve a word in under 2 seconds' },
  { id: 'word_master', icon: '📖', title: 'Word Master', description: 'Solve 10 words in a single game' },
  { id: 'perfect_game', icon: '💎', title: 'Perfectionist', description: 'Solve all 15 words in one game' },
  { id: 'daily_warrior', icon: '📅', title: 'Daily Warrior', description: 'Complete 7 daily challenges' },
  { id: 'level_5', icon: '🌟', title: 'Halfway There', description: 'Reach Level 5' },
  { id: 'level_10', icon: '👑', title: 'Word King', description: 'Complete Level 10' },
  { id: 'long_word', icon: '🔠', title: 'Long Word Pro', description: 'Solve an 8-letter word' },
  { id: 'no_timeout', icon: '🛡️', title: 'No Timeout', description: 'Complete game with zero timeouts' },
  { id: 'high_score', icon: '🏅', title: 'High Roller', description: 'Score 200+ in a single game' },
];

const STORAGE_KEY = 'wordscramble_achievements';

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
