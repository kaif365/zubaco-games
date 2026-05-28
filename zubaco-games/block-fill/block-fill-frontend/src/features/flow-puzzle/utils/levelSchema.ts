import type { FlowPuzzleLevel } from '@/features/flow-puzzle/types';

export const FLOW_LEVEL_SCHEMA_VERSION = 1;

export const flowLevelSchemaExample: FlowPuzzleLevel = {
  schemaVersion: FLOW_LEVEL_SCHEMA_VERSION,
  id: 'aurora-5x5-01',
  slug: 'aurora-5x5-01',
  packId: 'neon-origins',
  worldId: 'aurora-grid',
  order: 1,
  name: 'Aurora Circuit',
  description: 'Entry level tuned for short sessions and onboarding.',
  gridSize: 5,
  timeLimitSec: 120,
  difficulty: 'easy',
  theme: {
    name: 'Aurora Grid',
    boardGradient: ['#0b1330', '#101f49'],
    accent: '#5cf2ff',
    backgroundGlow: 'rgba(92, 242, 255, 0.35)',
  },
  nodes: [
    {
      id: 'pink-link',
      colorId: 'pink',
      colorHex: '#ff4bbd',
      glowHex: '#ffa1dd',
      endpoints: [
        { row: 0, col: 0 },
        { row: 4, col: 4 },
      ],
    },
    {
      id: 'cyan-link',
      colorId: 'cyan',
      colorHex: '#5cf2ff',
      glowHex: '#acf8ff',
      endpoints: [
        { row: 0, col: 4 },
        { row: 4, col: 0 },
      ],
    },
  ],
  blockedCells: [],
  enabledCells: [],
  objectives: {
    requireFullCoverage: true,
  },
  metadata: {
    backendLevelId: 'lvl_aurora_001',
    editorGroupId: 'world_aurora',
    analyticsKey: 'aurora_5x5_01',
    version: 1,
  },
};
