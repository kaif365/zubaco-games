import { createHash } from 'crypto';
export interface DailyChallenge { date: string; seed: number; level: number; bonusMultiplier: number; }
export function getDailyChallenge(gameId: string, date?: Date): DailyChallenge {
  const d = date || new Date();
  const dateStr = d.toISOString().slice(0, 10);
  const hash = createHash('sha256').update(`${gameId}:${dateStr}:daily`).digest();
  const seed = hash.readUInt32LE(0);
  const dayOfWeek = d.getDay();
  const level = dayOfWeek === 0 ? 7 : Math.min(dayOfWeek + 2, 10);
  const bonusMultiplier = 1.5 + (level - 1) * 0.1;
  return { date: dateStr, seed, level, bonusMultiplier };
}
export function isDailyChallengeDate(sessionDate: string, targetDate?: Date): boolean {
  const d = targetDate || new Date();
  return sessionDate === d.toISOString().slice(0, 10);
}
