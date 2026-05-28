import { appConfig } from '@/app/config/appConfig';
import { gameHttpClient } from '@/services/httpClient';
import type {
  BlockType,
  CellType,
  DemoResponse,
  EndBoardResponse,
  EndGameResponse,
  GameApiEnvelope,
  GameLevel,
  GameMove,
  GameScoreboard,
  GameSession,
  GameStatusResponse,
  LevelScore,
  PlacedBlock,
  ServerCell,
  SubmitMovesResponse,
} from '@/types/logic-reflector';
import { GameStatus } from '@/types/logic-reflector';
import {
  mockEndBoard,
  mockEndGame,
  mockGameStart,
  mockGetGameStatus,
  mockGetNextLevel,
  mockSubmitMoves,
} from './mockGameApi';

const CELL_TYPE_BY_CODE: Record<number, CellType> = {
  1: 'emitter',
  2: 'target',
  3: 'blocker',
  4: 'reflect-block',
  5: 'mirror-fwd',
  6: 'mirror-bwd',
  7: 'splitter',
};

const BLOCK_TYPE_BY_CODE: Record<number, BlockType> = {
  1: 'reflect-block',
  2: 'mirror-fwd',
  3: 'mirror-bwd',
  4: 'splitter',
  5: 'blocker',
};

const BLOCK_TYPE_CODE_BY_NAME: Record<BlockType, number> = {
  'reflect-block': 1,
  'mirror-fwd': 2,
  'mirror-bwd': 3,
  splitter: 4,
  blocker: 5,
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function finiteNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function stringValue(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function boolValue(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined;
}

function toEnvelope<T>(response: { data: unknown }): GameApiEnvelope<T> {
  const p = response.data;
  if (isRecord(p) && ('success' in p || 'statusCode' in p || 'message' in p || 'data' in p)) {
    return {
      success: typeof p.success === 'boolean' ? p.success : true,
      statusCode: typeof p.statusCode === 'number' ? p.statusCode : undefined,
      message: typeof p.message === 'string' ? p.message : undefined,
      data: p.data as T | undefined,
    };
  }
  return { success: true, data: p as T };
}

function mapEnvelopeData<TIn, TOut>(
  envelope: GameApiEnvelope<TIn>,
  map: (data: TIn) => TOut,
): GameApiEnvelope<TOut> {
  // Preserve the raw envelope on failure so clearData (and any other error
  // metadata in `data`) survives to the catch handler in useGameSession.
  if (!envelope.success) return envelope as unknown as GameApiEnvelope<TOut>;
  if (envelope.data == null) return { ...envelope, data: undefined };
  return { ...envelope, data: map(envelope.data) };
}

function normalizeCellType(value: unknown): CellType {
  if (typeof value === 'string') return value as CellType;
  if (typeof value === 'number' && CELL_TYPE_BY_CODE[value]) return CELL_TYPE_BY_CODE[value];
  throw new Error(`Unknown cell type from game API: ${String(value)}`);
}

function normalizeBlockType(value: unknown): BlockType {
  if (typeof value === 'string') return value as BlockType;
  if (typeof value === 'number' && BLOCK_TYPE_BY_CODE[value]) return BLOCK_TYPE_BY_CODE[value];
  throw new Error(`Unknown block type from game API: ${String(value)}`);
}

function normalizeCell(raw: unknown): ServerCell {
  if (!isRecord(raw)) throw new Error('Invalid cell from game API');
  const row = finiteNumber(raw.row);
  const col = finiteNumber(raw.col);
  if (row === undefined || col === undefined) throw new Error('Cell is missing row or col');

  return {
    id: stringValue(raw.id),
    row,
    col,
    type: normalizeCellType(raw.type),
    fixed: boolValue(raw.fixed) ?? false,
    direction: stringValue(raw.direction) as ServerCell['direction'],
    x: finiteNumber(raw.x),
    y: finiteNumber(raw.y),
    radius: finiteNumber(raw.radius),
    size: finiteNumber(raw.size),
    angle: finiteNumber(raw.angle),
    locksPlacement: boolValue(raw.locksPlacement),
  };
}

function normalizePlacedBlock(raw: unknown): PlacedBlock {
  if (!isRecord(raw)) throw new Error('Invalid initial block from game API');
  const row = finiteNumber(raw.row);
  const col = finiteNumber(raw.col);
  if (row === undefined || col === undefined)
    throw new Error('Initial block is missing row or col');

  return {
    id: stringValue(raw.id),
    row,
    col,
    type: normalizeBlockType(raw.type),
  };
}

function normalizeGameLevel(raw: unknown): GameLevel {
  if (!isRecord(raw)) throw new Error('Invalid board from game API');
  const gridSize = isRecord(raw.gridSize) ? raw.gridSize : null;
  if (!gridSize) throw new Error('Board is missing gridSize');

  const levelNumber = finiteNumber(raw.levelNumber) ?? finiteNumber(raw.roundNumber) ?? 1;
  const levelId =
    stringValue(raw.levelId) ??
    stringValue(raw.id) ??
    stringValue(raw.sessionBoardId) ??
    `round-${levelNumber}`;

  return {
    levelId,
    sessionBoardId: stringValue(raw.sessionBoardId),
    levelNumber,
    gridSize: {
      x: finiteNumber(gridSize.x) ?? 0,
      y: finiteNumber(gridSize.y) ?? 0,
    },
    cells: Array.isArray(raw.cells) ? raw.cells.map(normalizeCell) : [],
    initialBlocks: Array.isArray(raw.initialBlocks)
      ? raw.initialBlocks.map(normalizePlacedBlock)
      : undefined,
    availableBlocks: Array.isArray(raw.availableBlocks)
      ? raw.availableBlocks.map((block) => {
          if (!isRecord(block)) throw new Error('Invalid available block from game API');
          return {
            type: normalizeBlockType(block.type),
            count: finiteNumber(block.count) ?? 0,
          };
        })
      : undefined,
  };
}

function normalizeScoreboard(raw: unknown): GameScoreboard | undefined {
  if (!isRecord(raw)) return undefined;
  const rounds = Array.isArray(raw.rounds)
    ? raw.rounds
    : Array.isArray(raw.levels)
      ? raw.levels
      : [];
  const levels: LevelScore[] = rounds.map((round) => {
    if (!isRecord(round)) return { levelNumber: 0, score: null };
    return {
      levelNumber: finiteNumber(round.levelNumber) ?? finiteNumber(round.roundNumber) ?? 0,
      score: finiteNumber(round.score) ?? null,
      movesUsed: finiteNumber(round.movesUsed),
    };
  });

  return {
    levels,
    totalScore: finiteNumber(raw.totalScore) ?? 0,
    timeBonus: finiteNumber(raw.timeBonus),
  };
}

// Status codes that the backend may return without a board (game already over)
const TERMINAL_STATUS_CODES: ReadonlySet<number> = new Set([
  GameStatus.ENDED,
  GameStatus.EXPIRED,
  GameStatus.MANUALLY_ENDED,
  GameStatus.RESULT_PROCESSING,
]);

function normalizeGameSession(raw: unknown): GameSession {
  if (!isRecord(raw)) throw new Error('Invalid game session from game API');

  const status = (finiteNumber(raw.status) ?? GameStatus.STARTED) as GameSession['status'];

  // raw.board may be explicitly null when the session has ended — do NOT fall back to
  // `raw` in that case (it lacks gridSize and would throw).  Only fall back to `raw` when
  // both currentLevel and board are fully absent (undefined).
  const rawBoard =
    raw.currentLevel !== undefined
      ? raw.currentLevel
      : raw.board !== undefined
        ? raw.board // may be null — handled below
        : raw; // legacy: board fields inline

  let currentLevel: GameLevel;
  if (rawBoard != null) {
    currentLevel = normalizeGameLevel(rawBoard);
  } else if (TERMINAL_STATUS_CODES.has(status)) {
    // Terminal session with board: null — game is over, stub out the level
    currentLevel = { levelId: 'ended', levelNumber: 0, gridSize: { x: 0, y: 0 }, cells: [] };
  } else {
    // Active session should always have a board — let it throw meaningfully
    currentLevel = normalizeGameLevel(rawBoard);
  }

  return {
    sessionId: stringValue(raw.sessionId) ?? null,
    stageId: stringValue(raw.stageId) ?? appConfig.game.stageId,
    status,
    expiryAt: stringValue(raw.expiryAt) ?? '',
    startedAt: stringValue(raw.startedAt) ?? null,
    totalLevels:
      finiteNumber(raw.totalLevels) ??
      finiteNumber(raw.totalRounds) ??
      finiteNumber(raw.roundCount) ??
      0,
    currentLevel,
    scoreboard: normalizeScoreboard(raw.scoreboard),
  };
}

function normalizeSubmitMoves(raw: unknown): SubmitMovesResponse {
  if (!isRecord(raw)) return { accepted: 0 };
  return {
    accepted: finiteNumber(raw.accepted) ?? finiteNumber(raw.processed) ?? 0,
  };
}

function normalizeEndBoard(raw: unknown): EndBoardResponse {
  if (!isRecord(raw)) throw new Error('Invalid end-board response from game API');
  return {
    levelScore:
      finiteNumber(raw.levelScore) ??
      finiteNumber(raw.roundScore) ??
      finiteNumber(raw.score) ??
      null,
    gameOver: boolValue(raw.gameOver) ?? boolValue(raw.completed) ?? false,
  };
}

function normalizeGameStatus(raw: unknown): GameStatusResponse {
  if (!isRecord(raw)) throw new Error('Invalid game status response from game API');
  // Prefer the nested scoreboard object; only fall back to root-level fields when
  // the server returns scoreboard data inline (no wrapper key).
  const scoreboardSource =
    raw.scoreboard !== undefined && raw.scoreboard !== null ? raw.scoreboard : raw;
  return {
    sessionId: stringValue(raw.sessionId) ?? null,
    status: (finiteNumber(raw.status) ?? GameStatus.STARTED) as GameStatusResponse['status'],
    startedAt: stringValue(raw.startedAt) ?? null,
    expiryAt: stringValue(raw.expiryAt),
    scoreboard: normalizeScoreboard(scoreboardSource),
  };
}

function normalizeEndGame(raw: unknown): EndGameResponse {
  if (!isRecord(raw)) throw new Error('Invalid end-game response from game API');
  return {
    status: (finiteNumber(raw.status) ?? GameStatus.MANUALLY_ENDED) as EndGameResponse['status'],
  };
}

function hasBlockType(move: GameMove): move is GameMove & { blockType: BlockType } {
  return move.blockType !== null;
}

function toApiMove(move: GameMove & { blockType: BlockType }): Record<string, unknown> {
  return {
    moveId: move.moveId,
    blockId: move.blockId,
    row: move.row,
    col: move.col,
    blockType: BLOCK_TYPE_CODE_BY_NAME[move.blockType],
    placedAt: move.placedAt,
  };
}

export class GameApiEnvelopeError<T = unknown> extends Error {
  readonly envelope: GameApiEnvelope<T>;
  constructor(envelope: GameApiEnvelope<T>, fallback = 'Game API request failed') {
    super(envelope.message ?? fallback);
    this.name = 'GameApiEnvelopeError';
    this.envelope = envelope;
  }
}

export function ensureGameApiSuccess<T>(res: GameApiEnvelope<T>): GameApiEnvelope<T> {
  if (!res.success) throw new GameApiEnvelopeError(res);
  return res;
}

export function requireGameApiData<T>(
  res: GameApiEnvelope<T>,
  fallback = 'Game API response missing data',
): T {
  ensureGameApiSuccess(res);
  if (res.data == null) throw new Error(res.message ?? fallback);
  return res.data;
}

const IS_MOCK = appConfig.mock.enabled;

/** POST /v1/game/game-start */
export async function gameStart(): Promise<GameApiEnvelope<GameSession>> {
  if (IS_MOCK) return mockGameStart();
  const res = await gameHttpClient.post('/v1/game/game-start', {
    stageId: appConfig.game.stageId,
  });
  return mapEnvelopeData(toEnvelope<unknown>(res), normalizeGameSession);
}

function normalizeDemoResponse(raw: unknown): DemoResponse {
  if (!isRecord(raw)) throw new Error('Invalid demo response from API');
  return {
    stageId: stringValue(raw.stageId),
    enableDemo: boolValue(raw.enableDemo) ?? true,
    totalRounds: finiteNumber(raw.totalRounds),
    alreadySeen: boolValue(raw.alreadySeen) ?? false,
    boards: Array.isArray(raw.boards) ? raw.boards.map(normalizeGameLevel) : [],
  };
}

/** GET /v1/user/demo */
export async function getDemo(): Promise<GameApiEnvelope<DemoResponse>> {
  if (IS_MOCK) {
    return {
      success: true,
      statusCode: 200,
      data: { enableDemo: true, alreadySeen: false, boards: [] },
    };
  }
  const res = await gameHttpClient.get('/v1/user/demo');
  return mapEnvelopeData(toEnvelope<unknown>(res), normalizeDemoResponse);
}

/** POST /v1/game/submit-moves */
export async function submitMoves(
  moves: GameMove[],
): Promise<GameApiEnvelope<SubmitMovesResponse>> {
  if (IS_MOCK) return mockSubmitMoves(moves);
  const placementMoves = moves.filter(hasBlockType);
  if (placementMoves.length === 0) {
    return { success: true, statusCode: 200, data: { accepted: 0 } };
  }
  const res = await gameHttpClient.post('/v1/game/submit-moves', {
    moves: placementMoves.map(toApiMove),
  });
  return mapEnvelopeData(toEnvelope<unknown>(res), normalizeSubmitMoves);
}

/** POST /v1/game/end-board */
export async function endBoard(): Promise<GameApiEnvelope<EndBoardResponse>> {
  if (IS_MOCK) return mockEndBoard();
  const res = await gameHttpClient.post('/v1/game/end-board');
  return mapEnvelopeData(toEnvelope<unknown>(res), normalizeEndBoard);
}

/** GET /v1/game/next-level */
export async function getNextLevel(): Promise<GameApiEnvelope<GameSession>> {
  if (IS_MOCK) return mockGetNextLevel();
  const res = await gameHttpClient.get('/v1/game/next-level');
  return mapEnvelopeData(toEnvelope<unknown>(res), normalizeGameSession);
}

/** POST /v1/game/end-game */
export async function endGame(): Promise<GameApiEnvelope<EndGameResponse>> {
  if (IS_MOCK) return mockEndGame();
  const res = await gameHttpClient.post('/v1/game/end-game');
  return mapEnvelopeData(toEnvelope<unknown>(res), normalizeEndGame);
}

/** GET /v1/game/status */
export async function getGameStatus(): Promise<GameApiEnvelope<GameStatusResponse>> {
  if (IS_MOCK) return mockGetGameStatus();
  const res = await gameHttpClient.get('/v1/game/status');
  return mapEnvelopeData(toEnvelope<unknown>(res), normalizeGameStatus);
}
