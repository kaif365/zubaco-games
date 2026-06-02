import { motion } from 'framer-motion';

interface Stats {
  totalGames: number;
  totalWins: number;
  highScore: number;
  highestLevel: number;
  maxStreak: number;
  recentScores: number[];
}

function getStats(): Stats {
  const stored = localStorage.getItem('arrowgame_stats');
  if (stored) return JSON.parse(stored);
  return { totalGames: 0, totalWins: 0, highScore: 0, highestLevel: 0, maxStreak: 0, recentScores: [] };
}

interface StatsScreenProps {
  onClose: () => void;
}

export function StatsScreen({ onClose }: StatsScreenProps) {
  const stats = getStats();
  const winRate = stats.totalGames > 0 ? Math.round((stats.totalWins / stats.totalGames) * 100) : 0;

  const statItems = [
    { label: 'Games Played', value: stats.totalGames, icon: '🎮' },
    { label: 'Wins', value: stats.totalWins, icon: '🏆' },
    { label: 'Win Rate', value: `${winRate}%`, icon: '📊' },
    { label: 'High Score', value: stats.highScore, icon: '⭐' },
    { label: 'Highest Level', value: stats.highestLevel, icon: '🎯' },
    { label: 'Best Streak', value: stats.maxStreak, icon: '🔥' },
  ];

  return (
    <motion.div
      className="flex flex-col gap-4 px-4 py-6 w-full max-w-sm mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Your Stats</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {statItems.map((item, idx) => (
          <motion.div
            key={item.label}
            className="p-3 bg-gray-800/60 rounded-xl border border-gray-700/50"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{item.icon}</span>
              <span className="text-lg font-bold text-white">{item.value}</span>
            </div>
            <div className="text-xs text-gray-400">{item.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Recent scores chart */}
      {stats.recentScores.length > 1 && (
        <div className="p-4 bg-gray-800/60 rounded-xl border border-gray-700/50">
          <div className="text-sm font-medium text-gray-300 mb-3">Recent Scores</div>
          <div className="flex items-end gap-1 h-16">
            {stats.recentScores.slice(0, 15).map((score, idx) => {
              const max = Math.max(...stats.recentScores, 1);
              const height = Math.max(4, (score / max) * 100);
              return (
                <motion.div
                  key={idx}
                  className="flex-1 bg-indigo-500 rounded-t"
                  style={{ height: `${height}%` }}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: idx * 0.05 }}
                />
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={onClose}
        className="mt-2 w-full py-3 rounded-xl bg-gray-700 text-sm font-medium text-white hover:bg-gray-600 transition-colors"
      >
        Close
      </button>
    </motion.div>
  );
}

export function updateStats(won: boolean, score: number, level: number, maxStreak: number) {
  const stats = getStats();
  stats.totalGames++;
  if (won) stats.totalWins++;
  stats.highScore = Math.max(stats.highScore, score);
  stats.highestLevel = Math.max(stats.highestLevel, level);
  stats.maxStreak = Math.max(stats.maxStreak, maxStreak);
  stats.recentScores = [score, ...stats.recentScores].slice(0, 20);
  localStorage.setItem('arrowgame_stats', JSON.stringify(stats));
}
