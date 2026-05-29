import type { AvailableBlock, BlockType, GameLevel } from '@/types/logic-reflector';

const BLOCK_TYPES: BlockType[] = ['reflect-block', 'mirror-fwd', 'mirror-bwd', 'splitter', 'blocker'];

export function createEmptyBlockCounts(): Record<BlockType, number> {
  return {
    'reflect-block': 0,
    'mirror-fwd': 0,
    'mirror-bwd': 0,
    splitter: 0,
    blocker: 0,
  };
}

export function getLevelAvailableBlocks(level: GameLevel): AvailableBlock[] {
  if (level.availableBlocks && level.availableBlocks.length > 0) {
    return level.availableBlocks;
  }

  const counts = createEmptyBlockCounts();
  for (const block of level.initialBlocks ?? []) {
    counts[block.type] += 1;
  }

  return BLOCK_TYPES
    .map((type) => ({ type, count: counts[type] }))
    .filter((block) => block.count > 0);
}
