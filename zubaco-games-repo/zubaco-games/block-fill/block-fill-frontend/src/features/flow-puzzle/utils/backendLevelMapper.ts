import type { FlowPuzzleLevel, GridCoord } from '@/features/flow-puzzle/types';

interface SessionBoardNode {
  colorCode: string;
  points: GridCoord[];
}

interface SessionBoard {
  sessionBoardId: string;
  boardId: string;
  name: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  gameType?: string;
  gridRow: number;
  gridCol: number;
  nodes: SessionBoardNode[];
  timeLimit?: number;
  version: number;
}

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
  blue: { colorHex: '#3b82f6', glowHex: '#93c5fd' },
  red: { colorHex: '#ef4444', glowHex: '#fca5a5' },
  green: { colorHex: '#22c55e', glowHex: '#86efac' },
};

const DEMO_THEME = {
  name: 'Demo Pulse',
  boardGradient: ['#09162c', '#11264a'] as [string, string],
  accent: '#5cf2ff',
  backgroundGlow: 'rgba(92, 242, 255, 0.28)',
};

const THEME_BY_DIFFICULTY = {
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
  expert: {
    name: 'Expert Pulse',
    boardGradient: ['#190c10', '#351620'] as [string, string],
    accent: '#ff5a7c',
    backgroundGlow: 'rgba(255, 90, 124, 0.28)',
  },
} as const;

/**
 * Converts a raw backend session board into a `FlowPuzzleLevel` ready for the game engine, mapping difficulty to theme and demo-round metadata.
 *
 * @param board The raw board data from the backend
 * @param stageId The stage identifier
 * @param sessionId The active session identifier
 * @param roundNumber The current round number from the session
 * @param totalRounds The total number of rounds in the session
 * @param isDemoRound Whether this board is a demo round
 * @param currentDemoRound The current demo round index
 * @param currentActualRound The current actual (scored) round index
 * @param totalActualRounds The total number of actual (scored) rounds
 * @param requestedDemoRound The requested demo round echoed back from the backend
 * @param requestedActualRound The requested actual round echoed back from the backend
 * @returns The mapped FlowPuzzleLevel ready for the game engine
 */
export function mapSessionBoardToFlowLevel(
  board: SessionBoard,
  stageId: string,
  sessionId: string,
  roundNumber: number,
  totalRounds: number,
  isDemoRound = false,
  currentDemoRound = 0,
  currentActualRound = 0,
  totalActualRounds = 0,
  requestedDemoRound?: number,
  requestedActualRound?: number,
) {
  const rows = board.gridRow;
  const cols = board.gridCol;
  const displayOrder = isDemoRound ? currentDemoRound : currentActualRound;
  const difficulty = board.difficulty ?? 'easy';
  const timeLimitSec = board.timeLimit ?? 180;

  const level: FlowPuzzleLevel = {
    schemaVersion: 1,
    id: board.sessionBoardId,
    slug: board.sessionBoardId,
    packId: 'backend-stage',
    worldId: stageId,
    order: displayOrder || roundNumber,
    name: board.name,
    description: `Session round ${roundNumber} of ${totalRounds}`,
    gridSize: rows === cols ? rows : undefined,
    rows,
    cols,
    timeLimitSec,
    difficulty,
    theme: THEME_BY_DIFFICULTY[difficulty],
    nodes: board.nodes.map((node, index) => {
      const colors = COLOR_HEX_BY_CODE[node.colorCode] ?? {
        colorHex: '#5cf2ff',
        glowHex: '#c7fbff',
      };
      const start = node.points[0] ?? { row: 0, col: 0 };
      const end = node.points[node.points.length - 1] ?? start;

      return {
        id: `${node.colorCode}-${index + 1}`,
        colorId: node.colorCode,
        colorHex: colors.colorHex,
        glowHex: colors.glowHex,
        endpoints: [start, end],
      };
    }),
    metadata: {
      version: board.version,
      backendLevelId: board.boardId,
      analyticsKey: sessionId,
      sessionId,
      sessionBoardId: board.sessionBoardId,
      isDemoRound,
      currentDemoRound,
      currentActualRound,
      totalActualRounds: totalActualRounds || undefined,
      requestedDemoRound,
      requestedActualRound,
    },
  };

  return level;
}

export function mapDemoBoardToFlowLevel(board: SessionBoard, order: number): FlowPuzzleLevel {
  const rows = board.gridRow;
  const cols = board.gridCol;
  return {
    schemaVersion: 1,
    id: board.boardId,
    slug: board.boardId,
    packId: 'demo',
    worldId: 'demo',
    order,
    name: board.name,
    description: 'Connect the coloured dots to learn how to play.',
    gridSize: rows === cols ? rows : undefined,
    rows,
    cols,
    timeLimitSec: 300,
    difficulty: (board.difficulty ?? 'easy') as 'easy' | 'medium' | 'hard' | 'expert',
    theme: DEMO_THEME,
    nodes: board.nodes.map((node, index) => {
      const colors = COLOR_HEX_BY_CODE[node.colorCode] ?? { colorHex: '#5cf2ff', glowHex: '#c7fbff' };
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
      version: board.version,
      isDemoRound: true,
    },
  };
}
