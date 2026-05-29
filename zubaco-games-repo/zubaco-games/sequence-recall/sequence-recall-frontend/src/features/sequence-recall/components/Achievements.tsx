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

const STORAGE_KEY = 'sequence-recall-achievements';

const ACHIEVEMENT_DEFS: Omit<Achievement, 'unlocked'>[] = [
  { id: 'FIRST_WIN', title: 'First Victory', description: 'Complete your first game', icon: '🏆' },
  { id: 'STREAK_5', title: 'On Fire', description: 'Get a 5-round streak', icon: '🔥' },
  { id: 'STREAK_10', title: 'Unstoppable', description: 'Get a 10-round streak', icon: '⚡' },
  { id: 'PERFECT_GAME', title: 'Perfectionist', description: 'Complete a game with no mistakes', icon: '💎' },
  { id: 'SPEED_DEMON', title: 'Speed Demon', description: 'Finish with >50% time remaining', icon: '⏱️' },
  { id: 'PERSISTENCE', title: 'Dedicated', description: 'Play 50 games total', icon: '🎯' },
  { id: 'LEVEL_5', title: 'Rising Star', description: 'Reach level 5', icon: '⭐' },
  { id: 'LEVEL_10', title: 'Master', description: 'Reach level 10', icon: '👑' },
  { id: 'HIGH_SCORER', title: 'High Scorer', description: 'Score over 1000 points', icon: '📈' },
  { id: 'NO_MISTAKES', title: 'Flawless', description: 'Complete without any wrong taps', icon: '✨' },
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
  streak: number;
  perfect: boolean;
  timeRemainingPercent: number;
  level: number;
  score: number;
}): Achievement | null {
  const achievements = loadAchievements();
  let newlyUnlocked: Achievement | null = null;

  const checks: [string, boolean][] = [
    ['FIRST_WIN', params.gamesPlayed >= 1],
    ['STREAK_5', params.streak >= 5],
    ['STREAK_10', params.streak >= 10],
    ['PERFECT_GAME', params.perfect],
    ['SPEED_DEMON', params.timeRemainingPercent > 50],
    ['PERSISTENCE', params.gamesPlayed >= 50],
    ['LEVEL_5', params.level >= 5],
    ['LEVEL_10', params.level >= 10],
    ['HIGH_SCORER', params.score >= 1000],
    ['NO_MISTAKES', params.perfect],
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
