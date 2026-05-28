import { getStageTheme, type StageId } from '@/constants/stageTheme';

function hexToRgb(hex: string): string {
  const m = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return '0, 0, 0';
  return `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
}

/** Syncs stage CSS variables and body background on `document.documentElement`. */
export function applyDocumentStageTheme(stageNumber: StageId): void {
  const theme = getStageTheme(stageNumber);
  const root = document.documentElement;
  root.style.setProperty('--stage-bg', theme.bg);
  root.style.setProperty('--bg-color', theme.bg);
  root.style.setProperty('--stage-eclipse', theme.eclipse);
  root.style.setProperty('--stage-eclipse-mid', theme.eclipseMid);
  root.style.setProperty('--stage-eclipse-glow', theme.eclipseGlow);
  root.style.setProperty('--game-accent', theme.accent);
  root.style.setProperty('--game-accent-rgb', hexToRgb(theme.accent));
  root.style.setProperty('--stage-accent', theme.accent);
  root.style.setProperty('--stage-accent-rgb', hexToRgb(theme.accent));
}
