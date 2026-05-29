import type { Difficulty, FlowLevelTheme, FlowPuzzleLevel } from '@/features/flow-puzzle/types';
import demoLevelJson from './demo/demo-level.json';
import demoLevel2Json from './demo/demo-level-2.json';

const DEMO_THEME: FlowLevelTheme = {
  name: 'Demo Pulse',
  boardGradient: ['#09162c', '#11264a'],
  accent: '#5cf2ff',
  backgroundGlow: 'rgba(92, 242, 255, 0.28)',
};

const COLOR_HEX_BY_CODE: Record<string, { colorHex: string; glowHex: string }> = {
  pink:   { colorHex: '#ff4bbd', glowHex: '#ff9ad9' },
  cyan:   { colorHex: '#5cf2ff', glowHex: '#c7fbff' },
  amber:  { colorHex: '#ffc247', glowHex: '#ffe29d' },
  violet: { colorHex: '#9f79ff', glowHex: '#d2c3ff' },
  mint:   { colorHex: '#58f3c1', glowHex: '#b9fde7' },
  orange: { colorHex: '#ff8a54', glowHex: '#ffd1ba' },
  rose:   { colorHex: '#ff5a7c', glowHex: '#ffbfcb' },
  indigo: { colorHex: '#6b7dff', glowHex: '#c4cbff' },
  teal:   { colorHex: '#4de6d8', glowHex: '#bafcf5' },
  gold:   { colorHex: '#ffd548', glowHex: '#ffefab' },
  blue:   { colorHex: '#3b82f6', glowHex: '#93c5fd' },
  red:    { colorHex: '#ef4444', glowHex: '#fca5a5' },
  green:  { colorHex: '#22c55e', glowHex: '#86efac' },
};

interface LocalLevelNode {
  colorCode: string;
  points: Array<{ row: number; col: number }>;
}

interface LocalLevelData {
  name: string;
  difficulty?: Difficulty;
  gridRow: number;
  gridCol: number;
  nodes: LocalLevelNode[];
}

function buildDemoFlowLevel(data: LocalLevelData, id: string, order: number): FlowPuzzleLevel {
  const { gridRow: rows, gridCol: cols } = data;
  return {
    schemaVersion: 1,
    id,
    slug: id,
    packId: 'demo',
    worldId: 'demo',
    order,
    name: data.name,
    description: 'Connect the coloured dots to learn how to play.',
    rows,
    cols,
    gridSize: rows === cols ? rows : undefined,
    timeLimitSec: 300,
    difficulty: data.difficulty ?? 'easy',
    theme: DEMO_THEME,
    nodes: data.nodes.map((node, index) => {
      const colors = COLOR_HEX_BY_CODE[node.colorCode] ?? { colorHex: '#5cf2ff', glowHex: '#c7fbff' };
      return {
        id: `${node.colorCode}-link-${index + 1}`,
        colorId: node.colorCode,
        colorHex: colors.colorHex,
        glowHex: colors.glowHex,
        endpoints: [
          node.points[0] ?? { row: 0, col: 0 },
          node.points[node.points.length - 1] ?? { row: 0, col: 0 },
        ],
      };
    }),
    metadata: { version: 0, isDemoRound: true },
  };
}

export const DEMO_LEVELS: FlowPuzzleLevel[] = [
  buildDemoFlowLevel(demoLevelJson as LocalLevelData, 'demo-level-1', 1),
  buildDemoFlowLevel(demoLevel2Json as LocalLevelData, 'demo-level-2', 2)
  // Add more demo levels here: buildDemoFlowLevel(otherJson as LocalLevelData, 'demo-level-2', 2),
];
