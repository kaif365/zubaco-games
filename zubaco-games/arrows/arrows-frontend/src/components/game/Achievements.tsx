import { useEffect, useState } from 'react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'FIRST_WIN', title: 'First Victory', description: 'Complete your first level', icon: '🏆' },
  { id: 'STREAK_5', title: 'On Fire', description: 'Remove 5 arrows in a row without a mistake', icon: '🔥' },
  { id: 'STREAK_10', title: 'Unstoppable', description: '10 correct moves in a row', icon: '⚡' },
  { id: 'PERFECT_GAME', title: 'Perfectionist', description: 'Complete a level with no mistakes', icon: '💎' },
  { id: 'SPEED_DEMON', title: 'Speed Demon', description: 'Finish with >50% time remaining', icon: '⏱️' },
  { id: 'PERSISTENCE', title: 'Dedicated', description: 'Play 50 games', icon: '🎯' },
  { id: 'LEVEL_5', title: 'Rising Star', description: 'Reach level 5', icon: '⭐' },
  { id: 'LEVEL_10', title: 'Master', description: 'Complete all 10 levels', icon: '👑' },
  { id: 'HIGH_SCORER', title: 'High Scorer', description: 'Score over 500 points', icon: '📈' },
  { id: 'NO_MISTAKES', title: 'No Regrets', description: 'Win without using undo', icon: '✨' },
];

function getUnlockedAchievements(): Set<string> {
  const stored = localStorage.getItem('arrowgame_achievements');
  return stored ? new Set(JSON.parse(stored)) : new Set();
}

interface AchievementsProps {
  onClose: () => void;
}

export function Achievements({ onClose }: AchievementsProps) {
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());

  useEffect(() => {
    setUnlocked(getUnlockedAchievements());
  }, []);

  return (
    <div className="flex flex-col gap-4 px-4 py-6 w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Achievements</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="text-sm text-gray-400">
        {unlocked.size}/{ACHIEVEMENTS.length} unlocked
      </p>

      <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
        {ACHIEVEMENTS.map((a) => {
          const isUnlocked = unlocked.has(a.id);
          return (
            <div
              key={a.id}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                isUnlocked ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-gray-800/40 opacity-60'
              }`}
            >
              <div className="text-2xl">{a.icon}</div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${isUnlocked ? 'text-white' : 'text-gray-400'}`}>
                  {a.title}
                </div>
                <div className="text-xs text-gray-500 truncate">{a.description}</div>
              </div>
              {isUnlocked && (
                <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function checkAndUnlockAchievements(stats: {
  totalWins: number;
  maxStreak: number;
  highestLevel: number;
  highScore: number;
  totalGames: number;
  perfectGames: number;
  fastCompletions: number;
  noUndoWins: number;
}): string | null {
  const unlocked = getUnlockedAchievements();
  let newUnlock: string | null = null;

  const checks: [string, boolean][] = [
    ['FIRST_WIN', stats.totalWins >= 1],
    ['STREAK_5', stats.maxStreak >= 5],
    ['STREAK_10', stats.maxStreak >= 10],
    ['PERFECT_GAME', stats.perfectGames >= 1],
    ['SPEED_DEMON', stats.fastCompletions >= 1],
    ['PERSISTENCE', stats.totalGames >= 50],
    ['LEVEL_5', stats.highestLevel >= 5],
    ['LEVEL_10', stats.highestLevel >= 10],
    ['HIGH_SCORER', stats.highScore >= 500],
    ['NO_MISTAKES', stats.noUndoWins >= 1],
  ];

  for (const [id, condition] of checks) {
    if (condition && !unlocked.has(id)) {
      unlocked.add(id);
      newUnlock = id;
    }
  }

  localStorage.setItem('arrowgame_achievements', JSON.stringify([...unlocked]));
  return newUnlock;
}

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
