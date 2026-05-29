import type { CSSProperties } from 'react';

import { getStageTheme, type StageId } from '@/constants/stageTheme';

import { resolveUserStageNumber } from './resolveUserStageNumber';

function hexToRgb(hex: string): string {
  const m = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return '0, 0, 0';
  return `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
}

export function buildGameThemeStyle(stageNumber?: StageId): CSSProperties {
  const stage = stageNumber ?? resolveUserStageNumber();
  const theme = getStageTheme(stage);

  return {
    '--game-bg': theme.bg,
    '--game-bg-rgb': hexToRgb(theme.bg),
    '--game-eclipse': theme.eclipse,
    '--game-eclipse-rgb': hexToRgb(theme.eclipse),
    '--game-accent': theme.accent,
    '--game-accent-rgb': hexToRgb(theme.accent),
    '--stage-accent': theme.accent,
    '--stage-accent-rgb': hexToRgb(theme.accent),
    '--stage-bg': theme.bg,
    '--stage-eclipse': theme.eclipse,
    '--stage-eclipse-mid': theme.eclipseMid,
    '--stage-eclipse-glow': theme.eclipseGlow,
    background: theme.bg,
  } as CSSProperties;
}
