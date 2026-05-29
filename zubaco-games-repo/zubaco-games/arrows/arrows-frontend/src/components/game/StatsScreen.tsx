import { useEffect, useState } from 'react';

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
  const [stats, setStats] = useState<Stats>(getStats());

  useEffect(() => {
    setStats(getStats());
  }, []);

  const maxRecent = Math.max(...stats.recentScores, 1);

  return (
    <div className="flex flex-col gap-4 px-4 py-6 w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Statistics</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Games Played" value={stats.totalGames} icon="🎮" />
        <StatCard label="Wins" value={stats.totalWins} icon="🏆" />
        <StatCard label="High Score" value={stats.highScore} icon="⭐" />
        <StatCard label="Highest Level" value={stats.highestLevel} icon="📊" />
        <StatCard label="Best Streak" value={stats.maxStreak} icon="🔥" />
        <StatCard label="Win Rate" value={stats.totalGames > 0 ? `${Math.round((stats.totalWins / stats.totalGames) * 100)}%` : '0%'} icon="📈" />
      </div>

      {/* Recent scores chart */}
      {stats.recentScores.length > 0 && (
        <div className="p-4 bg-gray-800/60 rounded-xl">
          <div className="text-sm font-medium text-white mb-3">Recent Scores</div>
          <div className="flex items-end gap-1 h-20">
            {stats.recentScores.slice(-10).map((score, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-amber-500/70 rounded-t-sm min-h-[4px]"
                  style={{ height: `${(score / maxRecent) * 100}%` }}
                />
                <span className="text-[8px] text-gray-500">{score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="p-3 bg-gray-800/60 rounded-xl text-center">
      <div className="text-lg mb-1">{icon}</div>
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

export function updateStats(won: boolean, score: number, level: number, maxStreak: number) {
  const stats = getStats();
  stats.totalGames++;
  if (won) stats.totalWins++;
  stats.highScore = Math.max(stats.highScore, score);
  stats.highestLevel = Math.max(stats.highestLevel, level);
  stats.maxStreak = Math.max(stats.maxStreak, maxStreak);
  stats.recentScores = [...stats.recentScores.slice(-9), score];
  localStorage.setItem('arrowgame_stats', JSON.stringify(stats));
}
