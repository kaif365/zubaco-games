/**
 * Daily Challenge engine.
 * Generates deterministic daily challenge seeds and validates participation.
 */

import { createHash } from 'crypto';

export interface DailyChallenge {
  date: string; // YYYY-MM-DD
  seed: number;
  level: number;
  bonusMultiplier: number;
}

/**
 * Generate a deterministic daily seed based on date + game ID.
 */
export function getDailyChallenge(gameId: string, date?: Date): DailyChallenge {
  const d = date || new Date();
  const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
  const hash = createHash('sha256').update(`${gameId}:${dateStr}:daily`).digest();
  const seed = hash.readUInt32LE(0);

  // Difficulty scales with day of week (Mon=easier, Sun=hardest)
  const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon...6=Sat
  const level = dayOfWeek === 0 ? 7 : Math.min(dayOfWeek + 2, 10);
  const bonusMultiplier = 1.5 + (level - 1) * 0.1;

  return { date: dateStr, seed, level, bonusMultiplier };
}

/**
 * Check if a user has already completed today's daily challenge.
 */
export function isDailyChallengeDate(sessionDate: string, targetDate?: Date): boolean {
  const d = targetDate || new Date();
  const today = d.toISOString().slice(0, 10);
  return sessionDate === today;
}
