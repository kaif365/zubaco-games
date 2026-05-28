import {
  FLOW_DIFFICULTY_CONFIG,
  type FlowDifficultyKey,
} from '@/features/flow-puzzle/config/gameConfig';
import type { FlowLevelPack, FlowPuzzleLevel } from '@/features/flow-puzzle/types';

const levelModules = import.meta.glob('./levels/**/*.json', { eager: true, import: 'default' });

const DIFFICULTY_THEME_MAP = {
  easy: {
    name: 'Easy Pulse',
    boardGradient: ['#09162c', '#11264a'] as [string, string],
    accent: '#5cf2ff',
    backgroundGlow: 'rgba(92, 242, 255, 0.28)',
  },
  medium: {
    name: 'Medium Pulse',
    boardGradient: ['#120d29', '#1b2552'] as [string, string],
    accent: '#9f79ff',
    backgroundGlow: 'rgba(159, 121, 255, 0.28)',
  },
  hard: {
    name: 'Hard Pulse',
    boardGradient: ['#17101d', '#2b1a39'] as [string, string],
    accent: '#ff8a54',
    backgroundGlow: 'rgba(255, 138, 84, 0.28)',
  },
} as const;

const COLOR_HEX_BY_CODE: Record<string, { colorHex: string; glowHex: string }> = {
  pink: { colorHex: '#ff4bbd', glowHex: '#ff9ad9' },
  cyan: { colorHex: '#5cf2ff', glowHex: '#c7fbff' },
  amber: { colorHex: '#ffc247', glowHex: '#ffe29d' },
  violet: { colorHex: '#9f79ff', glowHex: '#d2c3ff' },
  mint: { colorHex: '#58f3c1', glowHex: '#b9fde7' },
  orange: { colorHex: '#ff8a54', glowHex: '#ffd1ba' },
  rose: { colorHex: '#ff5a7c', glowHex: '#ffbfcb' },
  indigo: { colorHex: '#6b7dff', glowHex: '#c4cbff' },
  teal: { colorHex: '#4de6d8', glowHex: '#bafcf5' },
  gold: { colorHex: '#ffd548', glowHex: '#ffefab' },
};

type CompactGeneratedLevel = {
  name: string;
  difficulty: FlowDifficultyKey;
  gridRow: number;
  gridCol: number;
  nodes: Array<{
    colorCode: string;
    points: Array<{ row: number; col: number }>;
  }>;
};

function normalizeLevel(level: FlowPuzzleLevel): FlowPuzzleLevel {
  return {
    ...level,
    rows: level.rows ?? level.gridSize,
    cols: level.cols ?? level.gridSize,
    theme: {
      ...level.theme,
      boardGradient: [level.theme.boardGradient[0], level.theme.boardGradient[1]],
    },
  };
}

function parseOrderFromPath(path: string) {
  const match = path.match(/level-(\d+)\.json$/);
  return match ? Number(match[1]) : 1;
}

function normalizeCompactLevel(level: CompactGeneratedLevel, sourcePath: string): FlowPuzzleLevel {
  const difficultyConfig = FLOW_DIFFICULTY_CONFIG[level.difficulty];
  const order = parseOrderFromPath(sourcePath);
  const packId = difficultyConfig.packId;
  const rows = level.gridRow;
  const cols = level.gridCol;
  const theme = DIFFICULTY_THEME_MAP[level.difficulty];

  return {
    schemaVersion: 1,
    id: `${packId}-${String(order).padStart(2, '0')}`,
    slug: `${packId}-${String(order).padStart(2, '0')}`,
    packId,
    worldId: packId,
    order,
    name: level.name,
    description: `${difficultyConfig.label} generated board.`,
    gridSize: rows === cols ? rows : undefined,
    rows,
    cols,
    timeLimitSec: level.difficulty === 'easy' ? 150 : level.difficulty === 'medium' ? 225 : 320,
    difficulty: level.difficulty,
    theme,
    nodes: level.nodes.map((node, index) => {
      const colors = COLOR_HEX_BY_CODE[node.colorCode] ?? {
        colorHex: '#5cf2ff',
        glowHex: '#c7fbff',
      };
      const start = node.points[0] ?? { row: 0, col: 0 };
      const end = node.points[node.points.length - 1] ?? start;

      return {
        id: `${node.colorCode}-link-${index + 1}`,
        colorId: node.colorCode,
        colorHex: colors.colorHex,
        glowHex: colors.glowHex,
        endpoints: [start, end],
      };
    }),
    metadata: {
      version: 1,
    },
  };
}

const packById = new Map<string, FlowLevelPack>();

(
  Object.entries(FLOW_DIFFICULTY_CONFIG) as [
    FlowDifficultyKey,
    (typeof FLOW_DIFFICULTY_CONFIG)[FlowDifficultyKey],
  ][]
).forEach(([, config]) => {
  packById.set(config.packId, {
    id: config.packId,
    backendPackId: config.packId,
    name: config.label,
    themeName: config.themeName,
    levels: [],
  });
});

Object.entries(levelModules).forEach(([sourcePath, levelFile]) => {
  const raw = levelFile as Partial<CompactGeneratedLevel> & FlowPuzzleLevel;
  const level =
    typeof raw.gridRow === 'number' &&
    typeof raw.gridCol === 'number' &&
    Array.isArray(raw.nodes) &&
    !('packId' in raw)
      ? normalizeCompactLevel(raw as CompactGeneratedLevel, sourcePath)
      : normalizeLevel(raw as FlowPuzzleLevel);
  const pack = packById.get(level.packId);
  if (!pack) {
    return;
  }

  pack.levels.push(level);
});

export const flowLevelPacks = Array.from(packById.values())
  .map((pack) => ({
    ...pack,
    levels: [...pack.levels].sort((a, b) => a.order - b.order),
  }))
  .filter((pack) => pack.levels.length > 0);
