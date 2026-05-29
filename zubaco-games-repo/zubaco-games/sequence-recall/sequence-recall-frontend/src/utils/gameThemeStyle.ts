import type { CSSProperties } from 'react';

import { getStageTheme } from '@/constants/stageTheme';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbString(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `${String(r)}, ${String(g)}, ${String(b)}`;
}

export function buildGameThemeStyle(stageNumber: number): CSSProperties {
  const theme = getStageTheme(stageNumber);
  return {
    '--game-bg': theme.bg,
    '--game-bg-rgb': rgbString(theme.bg),
    '--game-eclipse': theme.eclipse,
    '--game-eclipse-rgb': rgbString(theme.eclipse),
    '--game-accent': theme.accent,
    '--game-accent-rgb': rgbString(theme.accent),
    '--stage-bg': theme.bg,
    '--stage-eclipse': theme.eclipse,
    '--stage-eclipse-mid': theme.eclipseMid,
    '--stage-eclipse-glow': theme.eclipseGlow,
    background: theme.bg,
  } as CSSProperties;
}
