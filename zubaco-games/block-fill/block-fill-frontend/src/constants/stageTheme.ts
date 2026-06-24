export type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface StageTheme {
  bg: string;
  eclipse: string;
  eclipseMid: string;
  eclipseGlow: string;
  /** Matches micro-screens `resultAccent` for the stage. */
  accent: string;
}

export const STAGE_THEMES: Record<StageId, StageTheme> = {
  1: { bg: '#111827', eclipse: '#1f2937', eclipseMid: '#1f293752', eclipseGlow: '#1f2937b8', accent: '#10b981' },
  2: { bg: '#0f172a', eclipse: '#1e293b', eclipseMid: '#1e293b52', eclipseGlow: '#1e293bb8', accent: '#06b6d4' },
  3: { bg: '#111827', eclipse: '#1f2937', eclipseMid: '#1f293752', eclipseGlow: '#1f2937b8', accent: '#8b5cf6' },
  4: { bg: '#0f172a', eclipse: '#1e293b', eclipseMid: '#1e293b52', eclipseGlow: '#1e293bb8', accent: '#10b981' },
  5: { bg: '#111827', eclipse: '#1f2937', eclipseMid: '#1f293752', eclipseGlow: '#1f2937b8', accent: '#6366f1' },
  6: { bg: '#0f172a', eclipse: '#1e293b', eclipseMid: '#1e293b52', eclipseGlow: '#1e293bb8', accent: '#ec4899' },
  7: { bg: '#111827', eclipse: '#1f2937', eclipseMid: '#1f293752', eclipseGlow: '#1f2937b8', accent: '#06b6d4' },
};

const DEFAULT_STAGE_THEME = STAGE_THEMES[1];

export function getStageTheme(stageNumber: number): StageTheme {
  const id = stageNumber as StageId;
  return STAGE_THEMES[id] ?? DEFAULT_STAGE_THEME;
}
