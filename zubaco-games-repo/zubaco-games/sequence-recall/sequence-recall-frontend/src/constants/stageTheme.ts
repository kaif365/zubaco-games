export type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface StageTheme {
  bg: string;
  eclipse: string;
  eclipseMid: string;
  eclipseGlow: string;
  accent: string;
}

export const STAGE_THEMES: Record<StageId, StageTheme> = {
  1: {
    bg: '#0f0a1e',
    eclipse: '#1e1545',
    eclipseMid: '#1e154552',
    eclipseGlow: '#1e1545b8',
    accent: '#00f0ff',
  },
  2: {
    bg: '#0a1628',
    eclipse: '#153050',
    eclipseMid: '#15305052',
    eclipseGlow: '#153050b8',
    accent: '#38d9ff',
  },
  3: {
    bg: '#12071f',
    eclipse: '#2d1560',
    eclipseMid: '#2d156052',
    eclipseGlow: '#2d1560b8',
    accent: '#a78bfa',
  },
  4: {
    bg: '#071a1a',
    eclipse: '#0f3d3d',
    eclipseMid: '#0f3d3d52',
    eclipseGlow: '#0f3d3db8',
    accent: '#10b981',
  },
  5: {
    bg: '#0f0a1e',
    eclipse: '#3b1f7a',
    eclipseMid: '#3b1f7a52',
    eclipseGlow: '#3b1f7ab8',
    accent: '#c084fc',
  },
  6: {
    bg: '#1a0520',
    eclipse: '#4a1560',
    eclipseMid: '#4a156052',
    eclipseGlow: '#4a1560b8',
    accent: '#e879f9',
  },
  7: {
    bg: '#0a1020',
    eclipse: '#1e3a5f',
    eclipseMid: '#1e3a5f52',
    eclipseGlow: '#1e3a5fb8',
    accent: '#67e8f9',
  },
};

export function getStageTheme(stageNumber: number): StageTheme {
  const id: StageId =
    stageNumber >= 1 && stageNumber <= 7 ? (stageNumber as StageId) : 1;
  return STAGE_THEMES[id];
}
