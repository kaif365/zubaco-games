import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AchievementId =
  | 'FIRST_WIN'
  | 'STREAK_5'
  | 'STREAK_10'
  | 'PERFECT_GAME'
  | 'SPEED_DEMON'
  | 'PERSISTENCE'
  | 'LEVEL_5'
  | 'LEVEL_10'
  | 'HIGH_SCORER'
  | 'NO_MISTAKES';

interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  icon: string;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'FIRST_WIN', title: 'First Victory', description: 'Solve your first puzzle', icon: '🏆' },
  { id: 'STREAK_5', title: 'On Fire', description: 'Achieve a 5-level streak', icon: '🔥' },
  { id: 'STREAK_10', title: 'Unstoppable', description: 'Achieve a 10-level streak', icon: '⚡' },
  { id: 'PERFECT_GAME', title: 'Perfectionist', description: 'Solve with minimum blocks', icon: '💎' },
  { id: 'SPEED_DEMON', title: 'Speed Demon', description: 'Solve with >50% time remaining', icon: '⏱️' },
  { id: 'PERSISTENCE', title: 'Dedicated', description: 'Play 50 games', icon: '🎯' },
  { id: 'LEVEL_5', title: 'Rising Star', description: 'Reach level 5', icon: '⭐' },
  { id: 'LEVEL_10', title: 'Master', description: 'Reach level 10', icon: '👑' },
  { id: 'HIGH_SCORER', title: 'High Scorer', description: 'Score over 1000 points', icon: '📈' },
  { id: 'NO_MISTAKES', title: 'Flawless', description: 'Complete without removing any block', icon: '✨' },
];

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'logic-reflector-achievements';

function loadUnlocked(): Set<AchievementId> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

function saveUnlocked(set: Set<AchievementId>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

export function checkAchievements(context: {
  totalWins: number;
  maxStreak: number;
  perfectGames: number;
  fastCompletions: number;
  totalGamesPlayed: number;
  highestLevel: number;
  highestScore: number;
  noMistakes?: boolean;
}): AchievementId[] {
  const unlocked = loadUnlocked();
  const newlyUnlocked: AchievementId[] = [];

  const checks: [AchievementId, boolean][] = [
    ['FIRST_WIN', context.totalWins >= 1],
    ['STREAK_5', context.maxStreak >= 5],
    ['STREAK_10', context.maxStreak >= 10],
    ['PERFECT_GAME', context.perfectGames >= 1],
    ['SPEED_DEMON', context.fastCompletions >= 1],
    ['PERSISTENCE', context.totalGamesPlayed >= 50],
    ['LEVEL_5', context.highestLevel >= 5],
    ['LEVEL_10', context.highestLevel >= 10],
    ['HIGH_SCORER', context.highestScore >= 1000],
    ['NO_MISTAKES', context.noMistakes === true],
  ];

  for (const [id, condition] of checks) {
    if (condition && !unlocked.has(id)) {
      unlocked.add(id);
      newlyUnlocked.push(id);
    }
  }

  if (newlyUnlocked.length > 0) saveUnlocked(unlocked);
  return newlyUnlocked;
}

// ─── Popup Component ─────────────────────────────────────────────────────────

interface AchievementPopupProps {
  readonly achievementId: AchievementId | null;
  readonly onDismiss: () => void;
}

export function AchievementPopup({ achievementId, onDismiss }: AchievementPopupProps) {
  useEffect(() => {
    if (!achievementId) return;
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [achievementId, onDismiss]);

  const achievement = achievementId ? ACHIEVEMENTS.find((a) => a.id === achievementId) : null;

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0, y: -60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -60 }}
          onClick={onDismiss}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] cursor-pointer"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-slate-900/95 px-5 py-3 shadow-2xl backdrop-blur-md">
            <span className="text-2xl">{achievement.icon}</span>
            <div>
              <p className="text-xs text-amber-400 font-semibold">Achievement Unlocked!</p>
              <p className="text-sm text-white font-bold">{achievement.title}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Achievements Screen ─────────────────────────────────────────────────────

interface AchievementsProps {
  readonly onBack: () => void;
}

export function Achievements({ onBack }: AchievementsProps) {
  const [unlocked] = useState(() => loadUnlocked());

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 p-6">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={onBack} className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors">
          ← Back
        </button>
        <h2 className="text-lg font-bold text-white">Achievements</h2>
        <div className="w-16" />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3 max-w-sm mx-auto">
          {ACHIEVEMENTS.map((a, i) => {
            const isUnlocked = unlocked.has(a.id);
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-center gap-4 rounded-xl border p-4 ${
                  isUnlocked
                    ? 'border-amber-500/30 bg-slate-800/80'
                    : 'border-slate-700/30 bg-slate-900/50 opacity-50'
                }`}
              >
                <span className="text-2xl">{a.icon}</span>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                    {a.title}
                  </p>
                  <p className="text-xs text-slate-500">{a.description}</p>
                </div>
                {isUnlocked && <span className="text-emerald-400 text-sm">✓</span>}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
