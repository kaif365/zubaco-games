import type { GameLevel } from '@/types/logic-reflector';

const CELL_TYPE = {
  EMITTER: 1,
  TARGET: 2,
  BLOCKER: 3,
  REFLECT_BLOCK: 4,
  MIRROR_FWD: 5,
  MIRROR_BWD: 6,
  SPLITTER: 7,
} as const;

const BLOCK_TYPE = {
  REFLECT_BLOCK: 1,
  MIRROR_FWD: 2,
  MIRROR_BWD: 3,
  SPLITTER: 4,
  BLOCKER: 5,
} as const;

const CELL_TYPE_BY_CODE = {
  [CELL_TYPE.EMITTER]: 'emitter',
  [CELL_TYPE.TARGET]: 'target',
  [CELL_TYPE.BLOCKER]: 'blocker',
  [CELL_TYPE.REFLECT_BLOCK]: 'reflect-block',
  [CELL_TYPE.MIRROR_FWD]: 'mirror-fwd',
  [CELL_TYPE.MIRROR_BWD]: 'mirror-bwd',
  [CELL_TYPE.SPLITTER]: 'splitter',
} as const;

const BLOCK_TYPE_BY_CODE = {
  [BLOCK_TYPE.REFLECT_BLOCK]: 'reflect-block',
  [BLOCK_TYPE.MIRROR_FWD]: 'mirror-fwd',
  [BLOCK_TYPE.MIRROR_BWD]: 'mirror-bwd',
  [BLOCK_TYPE.SPLITTER]: 'splitter',
  [BLOCK_TYPE.BLOCKER]: 'blocker',
} as const;

type CellTypeCode = keyof typeof CELL_TYPE_BY_CODE;
type BlockTypeCode = keyof typeof BLOCK_TYPE_BY_CODE;

type RawLocalCell = Omit<GameLevel['cells'][number], 'type'> & {
  type: CellTypeCode;
};

type RawLocalBlock = Omit<NonNullable<GameLevel['initialBlocks']>[number], 'type'> & {
  id: string;
  type: BlockTypeCode;
};

type RawLocalLevel = Omit<GameLevel, 'cells' | 'initialBlocks'> & {
  cells: RawLocalCell[];
  initialBlocks?: RawLocalBlock[];
};

function normalizeLocalLevel(level: RawLocalLevel): GameLevel {
  return {
    ...level,
    cells: level.cells.map((cell) => ({
      ...cell,
      type: CELL_TYPE_BY_CODE[cell.type],
    })),
    initialBlocks: level.initialBlocks?.map((block) => ({
      ...block,
      type: BLOCK_TYPE_BY_CODE[block.type],
    })),
  };
}

/*
 * Board-space coordinates use grid units:
 *   x = 0 is the left board edge, x = 1 is the next grid line.
 *   y = 0 is the top board edge, y = 1 is the next grid line.
 *
 * Reflective blocks still snap to whole grid cells, but targets and emitters can
 * live inside a cell by providing x/y coordinates.
 */
const RAW_LEVELS: RawLocalLevel[] = [
  {
    levelId: 'lr-001',
    levelNumber: 1,
    gridSize: { x: 5, y: 5 },
    cells: [
      {
        id: 'e1',
        row: 3,
        col: 0,
        type: CELL_TYPE.EMITTER,
        fixed: true,
        x: 0.5,
        y: 3.08,
        direction: 'NE',
      },
      {
        id: 't1',
        row: 0,
        col: 0,
        type: CELL_TYPE.TARGET,
        fixed: true,
        x: 0.9,
        y: 0.32,
        radius: 0.15,
      },
    ],
    // Solution: move the block to row 1, col 2.
    initialBlocks: [{ id: 'lr-001-block-1', row: 3, col: 3, type: BLOCK_TYPE.REFLECT_BLOCK }],
  },
  {
    levelId: 'lr-002',
    levelNumber: 2,
    gridSize: { x: 5, y: 5 },
    cells: [
      {
        id: 'e1',
        row: 4,
        col: 0,
        type: CELL_TYPE.EMITTER,
        fixed: true,
        x: 0.6,
        y: 4.0,
        direction: 'NE',
      },
      {
        id: 't1',
        row: 0,
        col: 1,
        type: CELL_TYPE.TARGET,
        fixed: true,
        x: 1.9,
        y: 0.38,
        radius: 0.15,
      },
    ],
    // Solution: move the blocks to row 2, col 2 and row 1, col 0.
    initialBlocks: [
      { id: 'lr-002-block-1', row: 0, col: 3, type: BLOCK_TYPE.REFLECT_BLOCK },
      { id: 'lr-002-block-2', row: 3, col: 1, type: BLOCK_TYPE.REFLECT_BLOCK },
    ],
  },
  {
    levelId: 'lr-003',
    levelNumber: 3,
    gridSize: { x: 5, y: 5 },
    cells: [
      {
        id: 'e1',
        row: 3,
        col: 0,
        type: CELL_TYPE.EMITTER,
        fixed: true,
        x: 0.4,
        y: 3.4,
        direction: 'NE',
      },
      {
        id: 't1',
        row: 2,
        col: 1,
        type: CELL_TYPE.TARGET,
        fixed: true,
        x: 1.2,
        y: 2.6,
        radius: 0.15,
      },
      {
        id: 't2',
        row: 0,
        col: 0,
        type: CELL_TYPE.TARGET,
        fixed: true,
        x: 0.8,
        y: 0.54,
        radius: 0.15,
      },
    ],
    // Solution: move the block to row 1, col 2.
    initialBlocks: [{ id: 'lr-003-block-1', row: 4, col: 3, type: BLOCK_TYPE.REFLECT_BLOCK }],
  },
  {
    levelId: 'lr-004',
    levelNumber: 4,
    gridSize: { x: 6, y: 6 },
    cells: [
      {
        id: 'e1',
        row: 5,
        col: 0,
        type: CELL_TYPE.EMITTER,
        fixed: true,
        x: 0.5,
        y: 5.3,
        direction: 'NE',
      },
      { id: 'fixed-1', row: 2, col: 3, type: CELL_TYPE.REFLECT_BLOCK, fixed: true },
      {
        id: 't1',
        row: 0,
        col: 1,
        type: CELL_TYPE.TARGET,
        fixed: true,
        x: 1.36,
        y: 0.12,
        radius: 0.15,
      },
    ],
    // Solution: move the block to row 0, col 0.
    initialBlocks: [{ id: 'lr-004-block-1', row: 4, col: 4, type: BLOCK_TYPE.REFLECT_BLOCK }],
  },
  {
    levelId: 'lr-005',
    levelNumber: 5,
    gridSize: { x: 7, y: 7 },
    cells: [
      {
        id: 'e1',
        row: 6,
        col: 0,
        type: CELL_TYPE.EMITTER,
        fixed: true,
        x: 0.5,
        y: 6.4,
        direction: 'NE',
      },
      {
        id: 't1',
        row: 1,
        col: 3,
        type: CELL_TYPE.TARGET,
        fixed: true,
        x: 3.1,
        y: 1.48,
        radius: 0.15,
      },
      {
        id: 't2',
        row: 0,
        col: 4,
        type: CELL_TYPE.TARGET,
        fixed: true,
        x: 4.4,
        y: 0.18,
        radius: 0.15,
      },
    ],
    // Solution: move the blocks to row 3, col 3 and row 2, col 1.
    initialBlocks: [
      { id: 'lr-005-block-1', row: 0, col: 0, type: BLOCK_TYPE.REFLECT_BLOCK },
      { id: 'lr-005-block-2', row: 5, col: 5, type: BLOCK_TYPE.REFLECT_BLOCK },
    ],
  },
];

export const LEVELS: GameLevel[] = RAW_LEVELS.map(normalizeLocalLevel);
