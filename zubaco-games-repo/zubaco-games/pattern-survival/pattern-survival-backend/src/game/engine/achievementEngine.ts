/**
 * Achievement / Badge system.
 * Defines milestones and checks if they're unlocked.
 */

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

export interface Achievement {
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

export interface GameStats {
  totalGamesPlayed: number;
  totalWins: number;
  maxStreak: number;
  highestScore: number;
  highestLevel: number;
  perfectGames: number;
  fastCompletions: number;
}

const ACHIEVEMENTS: Achievement[] = [
  { id: AchievementId.FIRST_WIN, title: 'First Victory', description: 'Win your first game', icon: '🏆', xp: 50 },
  { id: AchievementId.STREAK_5, title: 'On Fire', description: 'Achieve a 5-streak combo', icon: '🔥', xp: 100 },
  { id: AchievementId.STREAK_10, title: 'Unstoppable', description: 'Achieve a 10-streak combo', icon: '⚡', xp: 250 },
  { id: AchievementId.PERFECT_GAME, title: 'Perfectionist', description: 'Complete a game with no mistakes', icon: '💎', xp: 200 },
  { id: AchievementId.SPEED_DEMON, title: 'Speed Demon', description: 'Finish with >50% time remaining', icon: '⏱️', xp: 150 },
  { id: AchievementId.PERSISTENCE, title: 'Dedicated', description: 'Play 50 games', icon: '🎯', xp: 300 },
  { id: AchievementId.LEVEL_5, title: 'Rising Star', description: 'Reach level 5', icon: '⭐', xp: 200 },
  { id: AchievementId.LEVEL_10, title: 'Master', description: 'Reach level 10', icon: '👑', xp: 500 },
  { id: AchievementId.HIGH_SCORER, title: 'High Scorer', description: 'Score over 1000 points', icon: '📈', xp: 150 },
  { id: AchievementId.NO_MISTAKES, title: 'Flawless', description: 'Complete without any errors', icon: '✨', xp: 200 },
];

export function getAllAchievements(): Achievement[] {
  return ACHIEVEMENTS;
}

export function checkAchievements(stats: GameStats, currentProgress: AchievementProgress[]): AchievementProgress[] {
  const now = new Date().toISOString();
  const unlocked = new Set(currentProgress.filter((p) => p.unlocked).map((p) => p.id));

  const checks: [AchievementId, boolean][] = [
    [AchievementId.FIRST_WIN, stats.totalWins >= 1],
    [AchievementId.STREAK_5, stats.maxStreak >= 5],
    [AchievementId.STREAK_10, stats.maxStreak >= 10],
    [AchievementId.PERFECT_GAME, stats.perfectGames >= 1],
    [AchievementId.SPEED_DEMON, stats.fastCompletions >= 1],
    [AchievementId.PERSISTENCE, stats.totalGamesPlayed >= 50],
    [AchievementId.LEVEL_5, stats.highestLevel >= 5],
    [AchievementId.LEVEL_10, stats.highestLevel >= 10],
    [AchievementId.HIGH_SCORER, stats.highestScore >= 1000],
    [AchievementId.NO_MISTAKES, stats.perfectGames >= 1],
  ];

  return checks.map(([id, condition]) => {
    if (unlocked.has(id)) {
      return currentProgress.find((p) => p.id === id)!;
    }
    return { id, unlocked: condition, unlockedAt: condition ? now : null };
  });
}
