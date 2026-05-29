import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onBack: () => void;
}

const STORAGE_KEY = 'pattern-survival-achievements';

interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'FIRST_WIN', title: 'First Victory', description: 'Survive your first round', icon: '🏆' },
  { id: 'STREAK_5', title: 'On Fire', description: 'Complete 5 rounds in a row', icon: '🔥' },
  { id: 'STREAK_10', title: 'Unstoppable', description: 'Complete 10 rounds in a row', icon: '⚡' },
  { id: 'PERFECT_GAME', title: 'Perfectionist', description: 'Survive 15+ rounds', icon: '💎' },
  { id: 'SPEED_DEMON', title: 'Speed Demon', description: 'Finish with >50% time remaining', icon: '⏱️' },
  { id: 'PERSISTENCE', title: 'Dedicated', description: 'Play 50 games', icon: '🎯' },
  { id: 'LEVEL_5', title: 'Rising Star', description: 'Reach level 5', icon: '⭐' },
  { id: 'LEVEL_10', title: 'Master', description: 'Reach level 10', icon: '👑' },
  { id: 'HIGH_SCORER', title: 'High Scorer', description: 'Score over 200 points', icon: '📈' },
  { id: 'NO_MISTAKES', title: 'Flawless', description: 'Complete 10 rounds without hesitation', icon: '✨' },
];

function loadUnlocked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

export function unlockAchievement(id: string): boolean {
  const set = loadUnlocked();
  if (set.has(id)) return false;
  set.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  return true;
}

export function AchievementPopup({ id, onDone }: { id: string; onDone: () => void }) {
  const def = ACHIEVEMENTS.find(a => a.id === id);
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }, [onDone]);
  if (!def) return null;
  return (
    <motion.div initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
      <span className="text-2xl">{def.icon}</span>
      <div><p className="font-bold text-sm">{def.title}</p><p className="text-xs opacity-80">{def.description}</p></div>
    </motion.div>
  );
}

export function Achievements({ onBack }: Props) {
  const [unlocked] = useState<Set<string>>(loadUnlocked);

  return (
    <div className="flex flex-col items-center min-h-screen px-6 py-8 gap-6">
      <div className="flex items-center w-full max-w-sm">
        <button onClick={onBack} className="text-gray-400 hover:text-white font-bold">← Back</button>
        <h2 className="flex-1 text-center text-2xl font-bold">Achievements</h2>
        <div className="w-12" />
      </div>

      <div className="w-full max-w-sm space-y-3">
        {ACHIEVEMENTS.map((ach, i) => {
          const isUnlocked = unlocked.has(ach.id);
          return (
            <motion.div
              key={ach.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3 ${!isUnlocked ? 'opacity-50' : ''}`}
            >
              <span className="text-2xl">{ach.icon}</span>
              <div className="flex-1">
                <p className="font-bold text-sm">{ach.title}</p>
                <p className="text-xs text-gray-400">{ach.description}</p>
              </div>
              {isUnlocked && <span className="text-green-400 font-bold">✓</span>}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
