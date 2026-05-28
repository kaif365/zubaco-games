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
  { id: 'FIRST_WIN', title: 'First Victory', description: 'Win your first game', icon: '🏆' },
  { id: 'STREAK_5', title: 'On Fire', description: 'Match 5 pairs in a row', icon: '🔥' },
  { id: 'STREAK_10', title: 'Unstoppable', description: 'Match 10 pairs in a row', icon: '⚡' },
  { id: 'PERFECT_GAME', title: 'Perfectionist', description: 'Complete with zero mismatches', icon: '💎' },
  { id: 'SPEED_DEMON', title: 'Speed Demon', description: 'Finish with >50% time remaining', icon: '⏱️' },
  { id: 'PERSISTENCE', title: 'Dedicated', description: 'Play 50 games', icon: '🎯' },
  { id: 'LEVEL_5', title: 'Rising Star', description: 'Reach level 5', icon: '⭐' },
  { id: 'LEVEL_10', title: 'Master', description: 'Reach level 10', icon: '👑' },
  { id: 'HIGH_SCORER', title: 'High Scorer', description: 'Score over 1000 points', icon: '📈' },
  { id: 'NO_MISTAKES', title: 'Flawless', description: 'Complete without any errors', icon: '✨' },
];

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'memory-card-achievements';

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

// ─── Popup ───────────────────────────────────────────────────────────────────

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
          style={{
            position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 100, cursor: 'pointer',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            borderRadius: '16px', border: '1px solid rgba(251,191,36,0.4)',
            background: 'rgba(15,23,42,0.95)', padding: '12px 20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          }}>
            <span style={{ fontSize: '1.5rem' }}>{achievement.icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#fbbf24', fontWeight: 600 }}>Achievement Unlocked!</p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>{achievement.title}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

interface AchievementsProps {
  readonly onBack: () => void;
}

export function Achievements({ onBack }: AchievementsProps) {
  const [unlocked] = useState(() => loadUnlocked());

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 40,
      display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)', padding: '24px',
    }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}>
          ← Back
        </button>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Achievements</h2>
        <div style={{ width: '50px' }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '320px', margin: '0 auto' }}>
          {ACHIEVEMENTS.map((a, i) => {
            const isUnlocked = unlocked.has(a.id);
            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  borderRadius: '12px', padding: '14px',
                  border: isUnlocked ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(71,85,105,0.3)',
                  background: isUnlocked ? 'rgba(30,27,75,0.8)' : 'rgba(15,23,42,0.5)',
                  opacity: isUnlocked ? 1 : 0.5,
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: isUnlocked ? '#fff' : '#94a3b8' }}>{a.title}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: '#64748b' }}>{a.description}</p>
                </div>
                {isUnlocked && <span style={{ color: '#34d399', fontSize: '0.85rem' }}>✓</span>}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
