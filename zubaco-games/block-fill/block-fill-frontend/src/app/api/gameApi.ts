import { appEnv, getGamePayloadSymmetricKey } from '@/app/config/env';
import { apiGet, apiPost } from '@/app/api/apiClient';
import { API_ENDPOINTS } from '@/app/api/endpoints';
import { mapDemoBoardToFlowLevel } from '@/features/flow-puzzle/utils/backendLevelMapper';
import type { FlowPuzzleLevel } from '@/features/flow-puzzle/types';
import type {
  CompleteBoardBody,
  SaveProgressBody,
  SaveProgressEnvelope,
} from '@/features/flow-puzzle/save-progress/saveProgressTypes';

interface SessionBoardNode {
  colorCode: string;
  points: Array<{ row: number; col: number }>;
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
  paths?: Array<{
    color: string;
    path: Array<{ row: number; col: number }>;
    completed: boolean;
  }>;
}

interface GameSessionData {
  sessionId: string;
  stageId: string;
  status: string;
  currentRoundNumber: number;
  currentDemoRound: number;
  currentActualRound: number;
  requestedDemoRound?: number;
  requestedActualRound?: number;
  totalRounds?: number;
  totalActualRounds?: number;
  isDemoRound: boolean;
  isActualRound: boolean;
  startTime?: string;
  endTime?: string;
  board: SessionBoard | null;
}

interface CurrentBoardData {
  sessionId: string;
  stageId: string;
  status: string;
  currentLevelId: string;
  totalDemoRounds: number;
  totalActualRounds: number;
  currentDemoRound: number;
  currentActualRound: number;
  requestedDemoRound: number;
  requestedActualRound: number;
  isDemoRound: boolean;
  isActualRound: boolean;
  startTime?: string;
  endTime?: string;
  board: SessionBoard;
}

interface GameEnvelope {
  success: boolean;
  statusCode: number;
  message: string;
  data: GameSessionData;
}

export interface GameConfig {
  stageId: string;
  timeLimit: number;
  enableDemo: boolean;
  totalRounds: number;
  totalDemoRounds: number;
  levels: Array<{ levelId: string; boardCount: number }>;
}

interface GameConfigEnvelope {
  success: boolean;
  statusCode: number;
  message: string;
  data: GameConfig;
}

interface GameEndData {
  finalScore: number;
  roundsCompleted: number;
  totalRounds: number;
}

interface GameEndEnvelope {
  success: boolean;
  statusCode: number;
  message: string;
  data: GameEndData;
}

interface CurrentBoardEnvelope {
  success: boolean;
  statusCode: number;
  message: string;
  data: CurrentBoardData;
}

export interface TimeSyncData {
  startTime: string;
  endTime: string;
  serverNow: string;
}

interface TimeSyncEnvelope {
  success: boolean;
  statusCode: number;
  message: string;
  data: TimeSyncData;
}

export interface NextBoardRequest {
  sessionId: string;
  requestedDemoRound: number;
  requestedActualRound: number;
}

export interface EndGameRequest {
  sessionId: string;
}

interface DemoApiBoard {
  sessionBoardId: string;
  boardId: string;
  name: string;
  levelId: string;
  gridRow: number;
  gridCol: number;
  nodes: Array<{ colorCode: string; points: Array<{ row: number; col: number }> }>;
  version: number;
  paths: unknown[];
}

interface DemoApiLevel {
  levelId: string;
  levelName: string;
  boards: DemoApiBoard[];
}

interface DemoApiResponse {
  stageId: string;
  enableDemo: boolean;
  alreadySeen: boolean;
  levels: DemoApiLevel[];
}

interface DemoApiEnvelope {
  success: boolean;
  statusCode: number;
  message: string;
  data: DemoApiResponse;
}

/**
 * Returns the configured game service base URL or throws when it is missing.
 *
 * @returns {string} The resolved base URL.
 */
function ensureGameBaseUrl() {
  if (!appEnv.gameServiceBaseUrl) {
    throw new Error('Missing VITE_GAME_SERVICE_BASE_URL environment variable');
  }
  return appEnv.gameServiceBaseUrl;
}

/**
 * Returns optional symmetric crypto options for API clients when payload encryption is enabled.
 *
 * @returns {{ symmetricPayloadCryptoKey?: string }} Crypto options object (possibly empty).
 */
function gamePayloadCryptoOptions() {
  const symmetricPayloadCryptoKey = getGamePayloadSymmetricKey();
  return symmetricPayloadCryptoKey ? { symmetricPayloadCryptoKey } : {};
}

/**
 * Ensures an API envelope reports success; otherwise throws with the server message or a fallback.
 *
 * @param {T} payload - The envelope with `success` and optional `message`.
 * @param {string} fallback - Error text when `message` is absent.
 *
 * @returns {T} The same payload after validation.
 */
function ensureSuccess<T extends { success: boolean; message?: string }>(
  payload: T,
  fallback: string,
) {
  if (!payload.success) {
    throw new Error(payload.message || fallback);
  }
  return payload;
}

/**
 * Fetches the stage game configuration (rounds, demo settings, time limit) from the backend.
 *
 * @param {string} stageId - The stage identifier to fetch config for.
 *
 * @returns {Promise<GameConfig>} The stage game configuration.
 */
export async function fetchDemoLevels(stageId: string): Promise<FlowPuzzleLevel[]> {
  const payload = await apiGet<DemoApiEnvelope>({
    baseUrl: ensureGameBaseUrl(),
    path: `${API_ENDPOINTS.user.demoLevels}?stageId=${encodeURIComponent(stageId)}`,
    ...gamePayloadCryptoOptions(),
  });
  ensureSuccess(payload, 'Failed to fetch demo levels');
  const boards = (payload.data?.levels ?? []).flatMap((level) => level.boards);
  return boards.map((board, index) => mapDemoBoardToFlowLevel(board, index + 1));
}

export async function fetchGameConfigs(stageId: string): Promise<GameConfig> {
  const payload = await apiGet<GameConfigEnvelope>({
    baseUrl: ensureGameBaseUrl(),
    path: `${API_ENDPOINTS.game.gameConfigs}?stageId=${encodeURIComponent(stageId)}`,
    ...gamePayloadCryptoOptions(),
  });
  ensureSuccess(payload, 'Failed to fetch game configs');
  if (!payload.data) {
    throw new Error('Invalid game configs response');
  }
  return payload.data;
}

/**
 * Starts a new game session for the given stage and returns the first board with session metadata.
 *
 * @param {string} stageId - The stage to start a session for.
 *
 * @returns {Promise<GameSessionData>} The initial board and session metadata.
 */
export async function startGameSession(stageId: string) {
  const payload = await apiPost<GameEnvelope, { stageId: string }>({
    baseUrl: ensureGameBaseUrl(),
    path: API_ENDPOINTS.game.startSession,
    body: { stageId },
    ...gamePayloadCryptoOptions(),
  });
  ensureSuccess(payload, 'Invalid start game session response');
  if (!payload.data) {
    throw new Error('Invalid start game session response');
  }
  // Allow COMPLETED sessions through so the caller can detect and restart
  if (!payload.data.board && payload.data.status !== 'COMPLETED') {
    throw new Error('Invalid start game session response');
  }
  return payload.data;
}

/**
 * Requests the next board for an active session and returns it with round metadata.
 *
 * @param {NextBoardRequest} body - Request body with session and round indices.
 *
 * @returns {Promise<GameSessionData>} The next board and round metadata.
 */
export async function fetchNextBoard(
  body: NextBoardRequest,
): Promise<GameSessionData & { board: SessionBoard }> {
  const payload = await apiPost<GameEnvelope, NextBoardRequest>({
    baseUrl: ensureGameBaseUrl(),
    path: API_ENDPOINTS.game.nextBoard,
    body,
    ...gamePayloadCryptoOptions(),
  });
  ensureSuccess(payload, 'Invalid next board response');
  if (!payload.data?.board) {
    throw new Error('Invalid next board response');
  }
  return payload.data as GameSessionData & { board: SessionBoard };
}

/**
 * Sends an autosave payload with the current board paths and returns the server-acknowledged version.
 *
 * @param {SaveProgressBody} body - Session, board, and path data to persist.
 *
 * @returns {Promise<SaveProgressEnvelope>} The server-acknowledged save envelope.
 */
export async function saveGameProgress(body: SaveProgressBody): Promise<SaveProgressEnvelope> {
  const payload = await apiPost<SaveProgressEnvelope, SaveProgressBody>({
    baseUrl: ensureGameBaseUrl(),
    path: API_ENDPOINTS.game.saveProgress,
    body,
    ...gamePayloadCryptoOptions(),
  });
  ensureSuccess(payload, 'Save progress failed');
  return payload;
}

/**
 * Marks a board as fully completed and sends the final path state; must be called before advancing to the next board.
 *
 * @param {CompleteBoardBody} body - Final path state for the completed board.
 *
 * @returns {Promise<SaveProgressEnvelope>} The server-acknowledged complete-board envelope.
 */
export async function completeBoard(body: CompleteBoardBody): Promise<SaveProgressEnvelope> {
  const payload = await apiPost<SaveProgressEnvelope, CompleteBoardBody>({
    baseUrl: ensureGameBaseUrl(),
    path: API_ENDPOINTS.game.completeBoard,
    body,
    ...gamePayloadCryptoOptions(),
  });
  ensureSuccess(payload, 'Complete board failed');
  return payload;
}

/**
 * Ends a game session and returns the final score for the completed run.
 *
 * @param {EndGameRequest} body - Request body containing the active session ID.
 *
 * @returns {Promise<GameEndData>} Final score payload.
 */
export async function endGameSession(body: EndGameRequest): Promise<GameEndData> {
  const payload = await apiPost<GameEndEnvelope, EndGameRequest>({
    baseUrl: ensureGameBaseUrl(),
    path: API_ENDPOINTS.game.gameEnd,
    body,
    ...gamePayloadCryptoOptions(),
  });
  ensureSuccess(payload, 'Failed to end game session');
  if (typeof payload.data?.finalScore !== 'number') {
    throw new Error('Invalid game end response');
  }
  const result = {
    finalScore: payload.data.finalScore,
    roundsCompleted: payload.data.roundsCompleted ?? 0,
    totalRounds: payload.data.totalRounds ?? 0,
  };
  console.log('[endGameSession] decoded response:', result);
  return result;
}

/**
 * Fetches server-authoritative start/end/now timestamps for a session, used to correct client-side timer drift.
 *
 * @param {string} sessionId - The active game session identifier.
 *
 * @returns {Promise<TimeSyncData>} Server timestamps for time sync.
 */
export async function fetchTimeSync(sessionId: string): Promise<TimeSyncData> {
  const payload = await apiGet<TimeSyncEnvelope>({
    baseUrl: ensureGameBaseUrl(),
    path: `${API_ENDPOINTS.game.timeSync}?sessionId=${encodeURIComponent(sessionId)}`,
    ...gamePayloadCryptoOptions(),
  });
  ensureSuccess(payload, 'Failed to fetch time sync');
  return payload.data;
}

/**
 * Fetches the currently active board for a given session, used to restore gameplay after refresh.
 *
 * @param {string} sessionId - The active game session identifier.
 *
 * @returns {Promise<CurrentBoardData>} Current board payload with round metadata.
 */
export async function fetchCurrentBoard(sessionId: string): Promise<CurrentBoardData> {
  const payload = await apiGet<CurrentBoardEnvelope>({
    baseUrl: ensureGameBaseUrl(),
    path: `/game/session/${encodeURIComponent(sessionId)}/current-board`,
    ...gamePayloadCryptoOptions(),
  });
  ensureSuccess(payload, 'Failed to fetch current board');
  if (!payload.data?.board) {
    throw new Error('Invalid current board response');
  }
  return payload.data;
}
