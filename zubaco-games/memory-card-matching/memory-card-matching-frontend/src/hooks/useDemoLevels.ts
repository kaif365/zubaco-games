import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { demoLevelsQueryOptions } from '@/api/demoLevels.query';
import { DEMO_MEMORY_IMAGE_PATHS } from '@/constants/demo-memory-images';
import type { LevelCard, LevelData } from '@/models/game.types';

const shuffleArray = <T>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const buildLocalDemoLevel = (levelIndex: number, gridRows: number, gridColumns: number): LevelData => {
  const pairCount = (gridRows * gridColumns) / 2;
  const imagePaths = shuffleArray([...DEMO_MEMORY_IMAGE_PATHS]).slice(0, pairCount);
  const cards: LevelCard[] = shuffleArray(
    imagePaths.flatMap((imageUrl, i) => {
      const pairId = `demo-pair-${i}`;
      return [
        { id: `${pairId}-a`, pairId, contentType: 'image' as const, content: '', imageUrl },
        { id: `${pairId}-b`, pairId, contentType: 'image' as const, content: '', imageUrl },
      ];
    }),
  );
  return {
    levelIndex,
    gridRows,
    gridColumns,
    cardContentType: 'image',
    previewDurationSeconds: 3,
    mismatchDisplayDurationSeconds: 1,
    cards,
  };
};

/*
 * --- Legacy demo (symbols / emoji-style rounds) — kept for future reference ---
 * import { SYMBOLS } from '@/constants/game.constants';
 *
 * const buildDemoLevelSymbol = (levelIndex: number, gridRows: number, gridColumns: number): LevelData => {
 *   const pairCount = (gridRows * gridColumns) / 2;
 *   const symbols = shuffleArray([...SYMBOLS]).slice(0, pairCount);
 *   const cards: LevelCard[] = shuffleArray(
 *     symbols.flatMap((symbol, i) => {
 *       const pairId = `demo-pair-${i}`;
 *       return [
 *         { id: `${pairId}-a`, pairId, contentType: 'symbol' as const, content: symbol, imageUrl: null },
 *         { id: `${pairId}-b`, pairId, contentType: 'symbol' as const, content: symbol, imageUrl: null },
 *       ];
 *     }),
 *   );
 *   return {
 *     levelIndex,
 *     gridRows,
 *     gridColumns,
 *     cardContentType: 'symbol',
 *     previewDurationSeconds: 3,
 *     mismatchDisplayDurationSeconds: 1,
 *     cards,
 *   };
 * };
 */

const DEMO_FROM_API = true;

interface UseDemoLevelsResult {
  demoLevels: LevelData[] | undefined;
  isLoading: boolean;
  isEmpty: boolean;
}

export const useDemoLevels = (): UseDemoLevelsResult => {
  const localLevels = useMemo<LevelData[]>(() => [
    buildLocalDemoLevel(0, 2, 2),
    buildLocalDemoLevel(1, 2, 4),
  ], []);

  const { data, isLoading, isError } = useQuery({
    ...demoLevelsQueryOptions(),
    enabled: DEMO_FROM_API,
  });

  if (!DEMO_FROM_API) {
    return { demoLevels: localLevels, isLoading: false, isEmpty: false };
  }

  if (isError) {
    return { demoLevels: localLevels, isLoading: false, isEmpty: false };
  }

  if (!isLoading && data && data.length === 0) {
    return { demoLevels: [], isLoading: false, isEmpty: true };
  }

  const resolvedLevels = data && data.length > 0 ? data : localLevels;

  return {
    demoLevels: isLoading ? undefined : resolvedLevels,
    isLoading,
    isEmpty: false,
  };
};
