type StageNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STAGE_THEMES: Record<StageNumber, Record<string, string>> = {
  1: { '--game-accent': '186 100% 47%', '--game-surface': '260 40% 12%', '--game-bg': '260 50% 8%' },
  2: { '--game-accent': '162 100% 45%', '--game-surface': '250 35% 14%', '--game-bg': '255 45% 9%' },
  3: { '--game-accent': '270 80% 65%', '--game-surface': '245 38% 15%', '--game-bg': '250 42% 10%' },
  4: { '--game-accent': '330 85% 60%', '--game-surface': '240 35% 16%', '--game-bg': '245 40% 10%' },
  5: { '--game-accent': '45 95% 55%', '--game-surface': '235 32% 17%', '--game-bg': '240 38% 11%' },
  6: { '--game-accent': '15 90% 55%', '--game-surface': '230 30% 16%', '--game-bg': '235 36% 10%' },
  7: { '--game-accent': '0 85% 55%', '--game-surface': '225 28% 15%', '--game-bg': '230 34% 9%' },
};

export function buildGameThemeStyle(stage: StageNumber): Record<string, string> {
  return STAGE_THEMES[stage] ?? STAGE_THEMES[1];
}
