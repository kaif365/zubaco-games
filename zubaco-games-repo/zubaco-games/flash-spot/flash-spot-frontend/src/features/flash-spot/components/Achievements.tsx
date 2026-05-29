import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ACHIEVEMENTS_KEY = 'zubaco_flash_spot_achievements';

interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  condition: (stats: AchievementCheck) => boolean;
}

export interface AchievementCheck {
  gamesPlayed: number;
  wins: number;
  highScore: number;
  bestStreak: number;
  bestAccuracy: number;
  highestLevel: number;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', icon: '🏆', title: 'First Victory', description: 'Complete your first round', condition: (s) => s.wins >= 1 },
  { id: 'on_fire', icon: '🔥', title: 'On Fire', description: 'Get a 5-tap streak', condition: (s) => s.bestStreak >= 5 },
  { id: 'unstoppable', icon: '💫', title: 'Unstoppable', description: 'Get a 10-tap streak', condition: (s) => s.bestStreak >= 10 },
  { id: 'sharp_eye', icon: '🎯', title: 'Sharp Eye', description: 'Achieve 90% accuracy', condition: (s) => s.bestAccuracy >= 0.9 },
  { id: 'perfect', icon: '💎', title: 'Perfectionist', description: '100% accuracy in a round', condition: (s) => s.bestAccuracy >= 1.0 },
  { id: 'speed_demon', icon: '⚡', title: 'Speed Demon', description: 'Score over 500 points', condition: (s) => s.highScore >= 500 },
  { id: 'high_scorer', icon: '🌟', title: 'High Scorer', description: 'Score over 1000 points', condition: (s) => s.highScore >= 1000 },
  { id: 'dedicated', icon: '🎮', title: 'Dedicated', description: 'Play 50 games', condition: (s) => s.gamesPlayed >= 50 },
  { id: 'rising_star', icon: '📈', title: 'Rising Star', description: 'Reach level 5', condition: (s) => s.highestLevel >= 5 },
  { id: 'master', icon: '👑', title: 'Master', description: 'Reach level 10', condition: (s) => s.highestLevel >= 10 },
];

function getUnlocked(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY) || '[]'));
  } catch { return new Set(); }
}

function saveUnlocked(ids: Set<string>): void {
  localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...ids]));
}

export function checkAchievements(stats: AchievementCheck): { id: string; title: string; icon: string } | null {
  const unlocked = getUnlocked();
  for (const a of ACHIEVEMENTS) {
    if (!unlocked.has(a.id) && a.condition(stats)) {
      unlocked.add(a.id);
      saveUnlocked(unlocked);
      return { id: a.id, title: a.title, icon: a.icon };
    }
  }
  return null;
}

interface AchievementsProps {
  onClose: () => void;
}

export function Achievements({ onClose }: AchievementsProps) {
  const unlocked = getUnlocked();
  const count = unlocked.size;

  return (
    <div className="flex h-screen flex-col bg-game-bg px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Achievements</h2>
        <button onClick={onClose} className="text-sm text-gray-400 hover:text-white">Close</button>
      </div>
      <p className="mb-4 text-sm text-gray-400">{count}/10 unlocked</p>

      <div className="space-y-3 overflow-y-auto">
        {ACHIEVEMENTS.map((a) => {
          const isUnlocked = unlocked.has(a.id);
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`flex items-center gap-3 rounded-xl p-3 ${
                isUnlocked ? 'bg-white/10 border border-game-accent/30' : 'bg-white/3 opacity-50'
              }`}
            >
              <span className="text-2xl">{a.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">{a.title}</div>
                <div className="text-xs text-gray-400">{a.description}</div>
              </div>
              {isUnlocked && <span className="text-emerald-400">✓</span>}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

interface AchievementPopupProps {
  achievement: { title: string; icon: string } | null;
  onDismiss: () => void;
}

export function AchievementPopup({ achievement, onDismiss }: AchievementPopupProps) {
  useEffect(() => {
    if (achievement) {
      const timer = setTimeout(onDismiss, 3000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onDismiss]);

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-game-accent/90 px-5 py-3 shadow-xl backdrop-blur"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{achievement.icon}</span>
            <div>
              <div className="text-xs text-white/80">Achievement Unlocked!</div>
              <div className="text-sm font-bold text-white">{achievement.title}</div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
