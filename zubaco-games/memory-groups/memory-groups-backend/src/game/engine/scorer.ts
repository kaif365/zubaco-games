import type { WordGroup } from './wordBank';
export interface GameConfig { showDurationMs: number; timeLimitMs: number; groupSize: number; totalGroups: number; pointsPerGroup: number; pointsPerPartialWord: number; timeBonusMultiplier: number; }

export function calculateScore(playerGroups: string[][], correctGroups: WordGroup[], timeRemainingMs: number, config: GameConfig): { correctGroupCount: number; partialWords: number; timeBonus: number; finalScore: number } {
  let correctGroupCount = 0;
  let partialWords = 0;
  for (const pg of playerGroups) {
    let bestMatch = 0;
    let isFullMatch = false;
    for (const cg of correctGroups) {
      const matches = pg.filter((w) => cg.words.includes(w)).length;
      if (matches === config.groupSize) { isFullMatch = true; break; }
      if (matches > bestMatch) bestMatch = matches;
    }
    if (isFullMatch) correctGroupCount++;
    else partialWords += bestMatch;
  }
  const timeBonus = Math.floor((timeRemainingMs / 1000) * config.timeBonusMultiplier);
  const finalScore = correctGroupCount * config.pointsPerGroup + partialWords * config.pointsPerPartialWord + timeBonus;
  return { correctGroupCount, partialWords, timeBonus, finalScore };
}
