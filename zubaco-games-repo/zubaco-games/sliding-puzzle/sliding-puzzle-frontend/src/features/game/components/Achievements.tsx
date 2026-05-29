import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

interface AchievementsProps {
  onBack: () => void;
}

const STORAGE_KEY = 'sliding-puzzle-achievements';

const ACHIEVEMENT_DEFS: Omit<Achievement, 'unlocked'>[] = [
  { id: 'FIRST_SOLVE', title: 'First Solve', description: 'Solve your first puzzle', icon: '🧩' },
  { id: 'SPEED_SOLVER', title: 'Speed Solver', description: 'Solve a puzzle under 30 seconds', icon: '⚡' },
  { id: 'PERFECT_3X3', title: 'Perfect 3×3', description: 'Solve 3×3 with minimum moves', icon: '💎' },
  { id: 'BIG_GRID', title: 'Going Big', description: 'Complete a 5×5 puzzle', icon: '🔲' },
  { id: 'STREAK_5', title: 'On a Roll', description: 'Solve 5 puzzles in a row', icon: '🔥' },
  { id: 'HIGH_SCORER', title: 'High Scorer', description: 'Score over 500 points', icon: '⭐' },
  { id: 'MARATHON', title: 'Marathon', description: 'Play for 30+ minutes total', icon: '🏃' },
  { id: 'LEVEL_5', title: 'Rising Star', description: 'Reach level 5', icon: '📈' },
  { id: 'LEVEL_10', title: 'Puzzle Master', description: 'Reach level 10', icon: '👑' },
  { id: 'DAILY_7', title: 'Weekly Warrior', description: 'Complete 7 daily challenges', icon: '📅' },
];

function loadAchievements(): Achievement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === ACHIEVEMENT_DEFS.length) return parsed;
    }
  } catch {}
  return ACHIEVEMENT_DEFS.map((a) => ({ ...a, unlocked: false }));
}

function saveAchievements(achievements: Achievement[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(achievements));
}

export function Achievements({ onBack }: AchievementsProps) {
  const [achievements] = useState<Achievement[]>(loadAchievements);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="min-h-screen flex flex-col p-6 bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-6 self-start">
        ← Back
      </button>

      <h2 className="text-2xl font-bold text-white text-center mb-2">Achievements</h2>
      <p className="text-center text-gray-400 text-sm mb-6">{unlockedCount}/{achievements.length} unlocked</p>

      <div className="space-y-3 max-w-sm mx-auto w-full">
        {achievements.map((ach, i) => (
          <motion.div
            key={ach.id}
            className={`flex items-center gap-4 p-4 rounded-xl bg-white/5 ${!ach.unlocked ? 'opacity-50' : ''}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: ach.unlocked ? 1 : 0.5, x: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          >
            <span className="text-3xl">{ach.icon}</span>
            <div className="flex-1">
              <div className="text-white font-semibold text-sm">{ach.title}</div>
              <div className="text-gray-400 text-xs">{ach.description}</div>
            </div>
            {ach.unlocked && <span className="text-emerald-400 text-lg">✓</span>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function AchievementPopup({ achievement, onDismiss }: { achievement: Achievement | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!achievement) return;
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [achievement, onDismiss]);

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          className="fixed top-4 left-4 right-4 z-50 flex items-center gap-3 p-4 rounded-xl bg-emerald-600/90 backdrop-blur shadow-lg"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
        >
          <span className="text-3xl">{achievement.icon}</span>
          <div>
            <div className="text-white font-bold text-sm">Achievement Unlocked!</div>
            <div className="text-emerald-100 text-xs">{achievement.title}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function checkAndUnlockAchievements(params: {
  gamesPlayed: number;
  solveTime: number;
  gridSize: string;
  moves: number;
  streak: number;
  score: number;
  totalTimeMs: number;
  level: number;
  dailiesCompleted: number;
}): Achievement | null {
  const achievements = loadAchievements();
  let newlyUnlocked: Achievement | null = null;

  const minMoves3x3 = 22; // approximate minimum for 3x3
  const checks: [string, boolean][] = [
    ['FIRST_SOLVE', params.gamesPlayed >= 1],
    ['SPEED_SOLVER', params.solveTime > 0 && params.solveTime < 30000],
    ['PERFECT_3X3', params.gridSize === '3×3' && params.moves <= minMoves3x3],
    ['BIG_GRID', params.gridSize === '5×5'],
    ['STREAK_5', params.streak >= 5],
    ['HIGH_SCORER', params.score >= 500],
    ['MARATHON', params.totalTimeMs >= 1800000],
    ['LEVEL_5', params.level >= 5],
    ['LEVEL_10', params.level >= 10],
    ['DAILY_7', params.dailiesCompleted >= 7],
  ];

  for (const [id, condition] of checks) {
    const ach = achievements.find((a) => a.id === id);
    if (ach && !ach.unlocked && condition) {
      ach.unlocked = true;
      if (!newlyUnlocked) newlyUnlocked = ach;
    }
  }

  saveAchievements(achievements);
  return newlyUnlocked;
}
