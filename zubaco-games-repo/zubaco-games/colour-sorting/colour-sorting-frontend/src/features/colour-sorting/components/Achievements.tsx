import { motion } from 'framer-motion';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', title: 'First Victory', description: 'Win your first game', icon: '🏆', unlocked: false },
  { id: 'streak_5', title: 'On Fire', description: 'Achieve a 5-move combo', icon: '🔥', unlocked: false },
  { id: 'streak_10', title: 'Unstoppable', description: 'Achieve a 10-move combo', icon: '⚡', unlocked: false },
  { id: 'perfect', title: 'Perfectionist', description: 'Complete without undo', icon: '💎', unlocked: false },
  { id: 'speed', title: 'Speed Demon', description: 'Finish with >50% time left', icon: '⏱️', unlocked: false },
  { id: 'persistence', title: 'Dedicated', description: 'Play 50 games', icon: '🎯', unlocked: false },
  { id: 'level_5', title: 'Rising Star', description: 'Reach level 5', icon: '⭐', unlocked: false },
  { id: 'level_10', title: 'Master', description: 'Reach level 10', icon: '👑', unlocked: false },
  { id: 'high_score', title: 'High Scorer', description: 'Score over 1000 points', icon: '📈', unlocked: false },
  { id: 'flawless', title: 'Flawless', description: 'No invalid move attempts', icon: '✨', unlocked: false },
];

const STORAGE_KEY = 'zubaco_colour_sort_achievements';

function getUnlockedAchievements(): Set<string> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

export function unlockAchievement(id: string): boolean {
  const unlocked = getUnlockedAchievements();
  if (unlocked.has(id)) return false;
  unlocked.add(id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...unlocked]));
  return true;
}

export function checkAchievements(stats: {
  totalWins: number;
  maxStreak: number;
  highestScore: number;
  highestLevel: number;
  totalGames: number;
  usedUndo: boolean;
  hadInvalidMove: boolean;
  timeRemainingPercent: number;
}): string[] {
  const newlyUnlocked: string[] = [];
  const checks: [string, boolean][] = [
    ['first_win', stats.totalWins >= 1],
    ['streak_5', stats.maxStreak >= 5],
    ['streak_10', stats.maxStreak >= 10],
    ['perfect', stats.totalWins >= 1 && !stats.usedUndo],
    ['speed', stats.timeRemainingPercent > 50],
    ['persistence', stats.totalGames >= 50],
    ['level_5', stats.highestLevel >= 5],
    ['level_10', stats.highestLevel >= 10],
    ['high_score', stats.highestScore >= 1000],
    ['flawless', stats.totalWins >= 1 && !stats.hadInvalidMove],
  ];

  for (const [id, condition] of checks) {
    if (condition && unlockAchievement(id)) {
      newlyUnlocked.push(id);
    }
  }
  return newlyUnlocked;
}

interface AchievementsProps {
  onClose: () => void;
}

export function Achievements({ onClose }: AchievementsProps) {
  const unlocked = getUnlockedAchievements();

  const achievements = ACHIEVEMENTS.map(a => ({
    ...a,
    unlocked: unlocked.has(a.id),
  }));

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <motion.div
      className="flex flex-col gap-4 px-4 py-6 w-full max-w-sm mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Achievements</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="text-sm text-gray-400">
        {unlockedCount}/{achievements.length} unlocked
      </div>

      <div className="flex flex-col gap-2">
        {achievements.map((achievement, idx) => (
          <motion.div
            key={achievement.id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all
              ${achievement.unlocked
                ? 'bg-gray-800/80 border-gray-600'
                : 'bg-gray-900/40 border-gray-700/50 opacity-60'
              }`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <div className={`text-2xl ${achievement.unlocked ? '' : 'grayscale'}`}>
              {achievement.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${achievement.unlocked ? 'text-white' : 'text-gray-500'}`}>
                {achievement.title}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {achievement.description}
              </div>
            </div>
            {achievement.unlocked && (
              <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </motion.div>
        ))}
      </div>

      <button
        onClick={onClose}
        className="mt-2 w-full py-3 rounded-xl bg-gray-700 text-sm font-medium text-white hover:bg-gray-600 transition-colors"
      >
        Close
      </button>
    </motion.div>
  );
}

// Achievement unlock popup notification
export function AchievementPopup({ title, icon, onDone }: { title: string; icon: string; onDone: () => void }) {
  return (
    <motion.div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 
        bg-gray-800 border border-yellow-500/50 rounded-xl shadow-xl shadow-yellow-500/10"
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -80, opacity: 0 }}
      onAnimationComplete={() => setTimeout(onDone, 2500)}
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <div className="text-xs text-yellow-400 font-medium">Achievement Unlocked!</div>
        <div className="text-sm text-white font-bold">{title}</div>
      </div>
    </motion.div>
  );
}
