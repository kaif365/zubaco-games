/**
 * Score history persistence utilities.
 * Helpers for storing and querying game score history.
 */

export interface ScoreRecord {
  sessionId: string;
  userId: string;
  score: number;
  level: number;
  maxStreak: number;
  comboBonus: number;
  timeBonusMs: number;
  completedAt: string;
  isDaily: boolean;
}

export interface PlayerStats {
  totalGames: number;
  totalScore: number;
  averageScore: number;
  highScore: number;
  highestLevel: number;
  longestStreak: number;
  winRate: number;
  recentScores: number[];
}

export function computePlayerStats(records: ScoreRecord[]): PlayerStats {
  if (records.length === 0) {
    return {
      totalGames: 0,
      totalScore: 0,
      averageScore: 0,
      highScore: 0,
      highestLevel: 0,
      longestStreak: 0,
      winRate: 0,
      recentScores: [],
    };
  }

  const totalGames = records.length;
  const totalScore = records.reduce((sum, r) => sum + r.score, 0);
  const averageScore = Math.round(totalScore / totalGames);
  const highScore = Math.max(...records.map((r) => r.score));
  const highestLevel = Math.max(...records.map((r) => r.level));
  const longestStreak = Math.max(...records.map((r) => r.maxStreak));
  const wins = records.filter((r) => r.score > 0).length;
  const winRate = Math.round((wins / totalGames) * 100);
  const recentScores = records
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 10)
    .map((r) => r.score);

  return { totalGames, totalScore, averageScore, highScore, highestLevel, longestStreak, winRate, recentScores };
}
