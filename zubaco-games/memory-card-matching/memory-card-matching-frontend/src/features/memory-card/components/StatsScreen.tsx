import { motion } from 'framer-motion';

// ─── Types & Storage ─────────────────────────────────────────────────────────

export interface GameStats {
  totalGamesPlayed: number;
  totalWins: number;
  totalPairsMatched: number;
  totalMismatches: number;
  perfectGames: number;
  maxStreak: number;
  highestLevel: number;
  fastCompletions: number;
  totalTimeSec: number;
  highestScore: number;
}

const STORAGE_KEY = 'memory-card-stats';

function loadStats(): GameStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    totalGamesPlayed: 0,
    totalWins: 0,
    totalPairsMatched: 0,
    totalMismatches: 0,
    perfectGames: 0,
    maxStreak: 0,
    highestLevel: 0,
    fastCompletions: 0,
    totalTimeSec: 0,
    highestScore: 0,
  };
}

function saveStats(stats: GameStats): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function getStats(): GameStats {
  return loadStats();
}

export function updateStats(updates: Partial<{
  gamesPlayed: number;
  wins: number;
  addPairs: number;
  addMismatches: number;
  perfectGames: number;
  maxStreak: number;
  highestLevel: number;
  fastCompletions: number;
  addTime: number;
  highestScore: number;
}>): GameStats {
  const stats = loadStats();
  if (updates.gamesPlayed !== undefined) stats.totalGamesPlayed = updates.gamesPlayed;
  if (updates.wins !== undefined) stats.totalWins = updates.wins;
  if (updates.addPairs !== undefined) stats.totalPairsMatched += updates.addPairs;
  if (updates.addMismatches !== undefined) stats.totalMismatches += updates.addMismatches;
  if (updates.perfectGames !== undefined) stats.perfectGames = Math.max(stats.perfectGames, updates.perfectGames);
  if (updates.maxStreak !== undefined) stats.maxStreak = Math.max(stats.maxStreak, updates.maxStreak);
  if (updates.highestLevel !== undefined) stats.highestLevel = Math.max(stats.highestLevel, updates.highestLevel);
  if (updates.fastCompletions !== undefined) stats.fastCompletions = Math.max(stats.fastCompletions, updates.fastCompletions);
  if (updates.addTime !== undefined) stats.totalTimeSec += updates.addTime;
  if (updates.highestScore !== undefined) stats.highestScore = Math.max(stats.highestScore, updates.highestScore);
  saveStats(stats);
  return stats;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface StatsScreenProps {
  readonly onBack: () => void;
}

const STAT_DISPLAY = [
  { key: 'totalGamesPlayed', label: 'Games Played', icon: '🎮' },
  { key: 'totalWins', label: 'Games Won', icon: '✅' },
  { key: 'totalPairsMatched', label: 'Pairs Matched', icon: '🃏' },
  { key: 'totalMismatches', label: 'Mismatches', icon: '❌' },
  { key: 'perfectGames', label: 'Perfect Games', icon: '💎' },
  { key: 'maxStreak', label: 'Best Streak', icon: '🔥' },
  { key: 'highestLevel', label: 'Highest Level', icon: '⭐' },
  { key: 'fastCompletions', label: 'Speed Runs', icon: '⚡' },
  { key: 'totalTimeSec', label: 'Total Time', icon: '⏱️', format: 'time' },
  { key: 'highestScore', label: 'High Score', icon: '📈' },
] as const;

export function StatsScreen({ onBack }: StatsScreenProps) {
  const stats = loadStats();

  function formatValue(value: number, format?: string): string {
    if (format === 'time') {
      const h = Math.floor(value / 3600);
      const m = Math.floor((value % 3600) / 60);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
    return value.toLocaleString();
  }

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
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Statistics</h2>
        <div style={{ width: '50px' }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', maxWidth: '320px', width: '100%', alignContent: 'start' }}>
          {STAT_DISPLAY.map((stat, i) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{
                borderRadius: '12px', border: '1px solid rgba(71,85,105,0.4)',
                background: 'rgba(30,27,75,0.6)', padding: '16px', textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{stat.icon}</div>
              <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                {formatValue((stats as Record<string, number>)[stat.key] ?? 0, stat.format)}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '0.65rem', color: '#94a3b8' }}>{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
