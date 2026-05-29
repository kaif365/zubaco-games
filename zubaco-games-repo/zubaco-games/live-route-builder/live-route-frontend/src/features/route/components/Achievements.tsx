import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

// ─── Types (mirrors backend achievementEngine.ts) ────────────────────────────

export enum AchievementId {
  FIRST_WIN = 'FIRST_WIN',
  STREAK_5 = 'STREAK_5',
  STREAK_10 = 'STREAK_10',
  PERFECT_GAME = 'PERFECT_GAME',
  SPEED_DEMON = 'SPEED_DEMON',
  PERSISTENCE = 'PERSISTENCE',
  LEVEL_5 = 'LEVEL_5',
  LEVEL_10 = 'LEVEL_10',
  HIGH_SCORER = 'HIGH_SCORER',
  NO_MISTAKES = 'NO_MISTAKES',
}

interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  icon: string;
  xp: number;
}

export interface AchievementProgress {
  id: AchievementId;
  unlocked: boolean;
  unlockedAt: string | null;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: AchievementId.FIRST_WIN, title: 'First Route', description: 'Complete your first game', icon: '🏆', xp: 50 },
  { id: AchievementId.STREAK_5, title: 'On Fire', description: 'Achieve a 5-edge combo streak', icon: '🔥', xp: 100 },
  { id: AchievementId.STREAK_10, title: 'Unstoppable', description: 'Achieve a 10-edge combo streak', icon: '⚡', xp: 250 },
  { id: AchievementId.PERFECT_GAME, title: 'Perfectionist', description: 'Achieve 90%+ path efficiency', icon: '💎', xp: 200 },
  { id: AchievementId.SPEED_DEMON, title: 'Speed Builder', description: 'Complete with >50% time remaining', icon: '⏱️', xp: 150 },
  { id: AchievementId.PERSISTENCE, title: 'Dedicated', description: 'Play 50 games', icon: '🎯', xp: 300 },
  { id: AchievementId.LEVEL_5, title: 'Rising Star', description: 'Reach level 5', icon: '⭐', xp: 200 },
  { id: AchievementId.LEVEL_10, title: 'Master Builder', description: 'Reach level 10', icon: '👑', xp: 500 },
  { id: AchievementId.HIGH_SCORER, title: 'High Scorer', description: 'Score over 500 points', icon: '📈', xp: 150 },
  { id: AchievementId.NO_MISTAKES, title: 'Efficient', description: 'Complete without redundant edges', icon: '✨', xp: 200 },
];

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'live-route-achievements';

function loadProgress(): AchievementProgress[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return ACHIEVEMENTS.map((a) => ({ id: a.id, unlocked: false, unlockedAt: null }));
}

function saveProgress(progress: AchievementProgress[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export interface CheckAchievementsInput {
  totalWins: number;
  maxStreak: number;
  perfectGames: number;
  fastCompletions: number;
  totalGamesPlayed: number;
  highestLevel: number;
  highestScore: number;
}

export function checkAchievements(stats: CheckAchievementsInput): AchievementId[] {
  const progress = loadProgress();
  const now = new Date().toISOString();
  const newlyUnlocked: AchievementId[] = [];

  const checks: [AchievementId, boolean][] = [
    [AchievementId.FIRST_WIN, stats.totalWins >= 1],
    [AchievementId.STREAK_5, stats.maxStreak >= 5],
    [AchievementId.STREAK_10, stats.maxStreak >= 10],
    [AchievementId.PERFECT_GAME, stats.perfectGames >= 1],
    [AchievementId.SPEED_DEMON, stats.fastCompletions >= 1],
    [AchievementId.PERSISTENCE, stats.totalGamesPlayed >= 50],
    [AchievementId.LEVEL_5, stats.highestLevel >= 5],
    [AchievementId.LEVEL_10, stats.highestLevel >= 10],
    [AchievementId.HIGH_SCORER, stats.highestScore >= 500],
    [AchievementId.NO_MISTAKES, stats.perfectGames >= 1],
  ];

  const updated = checks.map(([id, condition]) => {
    const existing = progress.find((p) => p.id === id);
    if (existing?.unlocked) return existing;
    if (condition) {
      newlyUnlocked.push(id);
      return { id, unlocked: true, unlockedAt: now };
    }
    return { id, unlocked: false, unlockedAt: null };
  });

  saveProgress(updated);
  return newlyUnlocked;
}

// ─── Achievement Popup ───────────────────────────────────────────────────────

interface AchievementPopupProps {
  readonly achievementId: AchievementId | null;
  readonly onDismiss: () => void;
}

export function AchievementPopup({ achievementId, onDismiss }: AchievementPopupProps) {
  const achievement = achievementId ? ACHIEVEMENTS.find((a) => a.id === achievementId) : null;

  useEffect(() => {
    if (!achievement) return;
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [achievement, onDismiss]);

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.9 }}
          className="fixed top-6 left-1/2 z-[100] -translate-x-1/2 rounded-xl border border-amber-400/30 bg-slate-900/95 px-5 py-3 shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{achievement.icon}</span>
            <div>
              <p className="text-xs text-amber-400 font-semibold">Achievement Unlocked!</p>
              <p className="text-sm font-bold text-white">{achievement.title}</p>
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
  const [progress] = useState(loadProgress);
  const totalXP = ACHIEVEMENTS.reduce((sum, a) => {
    const p = progress.find((pr) => pr.id === a.id);
    return sum + (p?.unlocked ? a.xp : 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-slate-950 p-6">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-lg font-bold text-white">Achievements</h2>
        <div className="w-16" />
      </div>

      {/* XP Summary */}
      <div className="mb-4 text-center">
        <p className="text-2xl font-bold text-amber-400">{totalXP} XP</p>
        <p className="text-xs text-slate-400">
          {progress.filter((p) => p.unlocked).length}/{ACHIEVEMENTS.length} unlocked
        </p>
      </div>

      {/* Badge List */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 max-w-sm mx-auto">
          {ACHIEVEMENTS.map((a, i) => {
            const p = progress.find((pr) => pr.id === a.id);
            const isUnlocked = p?.unlocked ?? false;

            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  isUnlocked
                    ? 'border-amber-500/30 bg-slate-800/80'
                    : 'border-slate-700/30 bg-slate-900/50 opacity-60'
                }`}
              >
                <span className={`text-2xl ${isUnlocked ? '' : 'grayscale'}`}>
                  {a.icon}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{a.title}</p>
                  <p className="text-xs text-slate-400">{a.description}</p>
                </div>
                <div className="text-xs text-amber-400 font-medium">
                  {isUnlocked ? `${a.xp} XP` : '🔒'}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
