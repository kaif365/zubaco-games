import type { CSSProperties } from 'react';

import { STAGE_THEME_COLORS } from '@micro-screens/src';
import type { StageId } from '@micro-screens/src/types/stage-theme';

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

function resolveStageNumber(value: string | undefined): StageId {
  const parsed = Number(value);
  return parsed === 1 || parsed === 2 || parsed === 3 || parsed === 4 || parsed === 5 || parsed === 6 || parsed === 7
    ? (parsed as StageId)
    : 1;
}

export function buildGameThemeStyle(stageNumber?: number): CSSProperties {
  const stage: StageId =
    stageNumber !== undefined
      ? resolveStageNumber(String(stageNumber))
      : resolveStageNumber(import.meta.env.VITE_STAGE_NUMBER as string | undefined);
  const theme = STAGE_THEME_COLORS[stage];

  return {
    '--game-bg': theme.background,
    '--game-bg-rgb': rgbString(theme.background),
    '--game-eclipse': theme.eclipse,
    '--game-eclipse-rgb': rgbString(theme.eclipse),
    '--game-accent': theme.resultAccent,
    '--game-accent-rgb': rgbString(theme.resultAccent),
    '--stage-bg': theme.background,
    '--stage-eclipse': theme.eclipse,
    '--stage-eclipse-rgb': rgbString(theme.eclipse),
    '--stage-accent': theme.resultAccent,
    '--stage-accent-rgb': rgbString(theme.resultAccent),
    background: theme.background,
  } as CSSProperties;
}
