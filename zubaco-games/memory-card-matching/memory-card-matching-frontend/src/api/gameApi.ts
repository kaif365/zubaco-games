import { get, post } from '@/api/httpClient';
import { GAME_TYPE } from '@/constants/game.constants';
import type {
  AnalyticsEventPayload,
  CompleteBoardResponse,
  CurrentSessionResponse,
  GameConfig,
  GameOverPayload,
  GameOverResponse,
  LevelCard,
  LevelData,
  MatchedPairEntry,
  NextLevelResponse,
  SaveProgressPayload,
  StageNumber,
  StartGameResponse,
  TimeSyncResponse,
} from '@/models/game.types';

interface DemoApiLevel {
  id: string;
  levelIndex: number;
  gridRows: number;
  gridColumns: number;
  cardContentType: string;
  previewDurationSeconds: number;
  mismatchDisplayDurationSeconds: number;
  cards: LevelCard[];
}

interface DemoApiResponse {
  stageId: string;
  enableDemo: boolean;
  alreadySeen: boolean;
  difficulties: Array<{
    difficultyId: string;
    difficultyName: string;
    levels: DemoApiLevel[];
  }>;
}
import type { StageContentApiData } from '@/types/stage-content-api';

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface MockSession {
  sessionId: string;
  currentLevelIndex: number;
  timeRemaining: number;
  matchedPairs: MatchedPairEntry[];
  currentLevel: LevelData;
}

let activeSession: MockSession | null = null;
let gameConfigPromise: Promise<GameConfig> | null = null;

const parseStageNumber = (value: unknown): StageNumber => {
  const n = typeof value === 'number' && !Number.isNaN(value) ? value : Number(value);
  if (n >= 1 && n <= 7) return n as StageNumber;
  return 1;
};

/** Prefer `VITE_STAGE_NUMBER` when set (matches sequence-recall standalone behavior); else API value. */
const resolveStageNumber = (apiStage: unknown): StageNumber => {
  const fromEnv = import.meta.env.VITE_STAGE_NUMBER;
  if (fromEnv !== undefined && String(fromEnv).trim() !== '') {
    return parseStageNumber(String(fromEnv).trim());
  }
  return parseStageNumber(apiStage);
};

const getGameConfig = async (): Promise<GameConfig> => {
  if (!gameConfigPromise) {
    gameConfigPromise = (async () => {
      const data = await get<{
        gameTimeLimitSeconds: number;
        totalLevels: number;
        enableDemo: boolean;
        stageNumber?: number;
      }>('/v1/game/session/game-configs');

      return {
        gameTimeLimitSeconds: data.gameTimeLimitSeconds,
        totalLevels: data.totalLevels,
        showDemo: data.enableDemo,
        stageNumber: resolveStageNumber(data.stageNumber),
      };
    })();
  }

  try {
    return await gameConfigPromise;
  } finally {
    gameConfigPromise = null;
  }
};

const getStageContent = async (language = 'EN'): Promise<StageContentApiData> => {
  const stageId = import.meta.env.VITE_STAGE_ID;
  if (!stageId) throw new Error('Missing VITE_STAGE_ID');

  const gameType = GAME_TYPE;
  const encodedStageId = encodeURIComponent(stageId);
  const encodedGameType = encodeURIComponent(gameType);
  const encodedLang = encodeURIComponent(language);

  const adminApiBaseUrl = import.meta.env.VITE_ADMIN_API_BASE_URL;
  if (!adminApiBaseUrl) throw new Error('Missing VITE_ADMIN_API_BASE_URL');

  const response = await fetch(
    `${adminApiBaseUrl}/admin/games/stage-content?stage_id=${encodedStageId}&game_type=${encodedGameType}&lang=${encodedLang}`,
    {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
  );

  const json: unknown = await response.json();
  const envelope =
    json !== null && typeof json === 'object'
      ? (json as { success?: boolean; message?: string; data?: unknown })
      : null;

  if (!response.ok || envelope?.success === false) {
    throw new Error(
      typeof envelope?.message === 'string' ? envelope.message : `HTTP error! status: ${response.status}`,
    );
  }

  const payload =
    envelope?.data !== null &&
    envelope?.data !== undefined &&
    typeof envelope.data === 'object'
      ? (envelope.data as StageContentApiData)
      : (json as StageContentApiData);
  return payload;
};

const startGame = async (): Promise<StartGameResponse> => {
  const response = await post<StartGameResponse>('/v1/game/session/start', {});
  const firstLevel = response.firstLevel;

  activeSession = {
    sessionId: response.sessionId,
    currentLevelIndex: 0,
    timeRemaining: Math.max(
      0,
      Math.round((new Date(response.endTime).getTime() - Date.now()) / 1000),
    ),
    matchedPairs: [],
    currentLevel: firstLevel,
  };
  return response;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getCurrentSession = async (_sessionId: string): Promise<CurrentSessionResponse> => {
  return get<CurrentSessionResponse>('/v1/game/session/current');
};

const getNextLevel = async (sessionId: string): Promise<NextLevelResponse> => {
  const response = await get<NextLevelResponse>('/v1/game/session/next-level');

  if (activeSession && activeSession.sessionId === sessionId) {
    activeSession.currentLevelIndex = response.level.levelIndex;
    activeSession.currentLevel = response.level;
  }

  return response;
};

const completeBoard = async (): Promise<CompleteBoardResponse> => {
  return post<CompleteBoardResponse>('/v1/game/session/complete-board');
};

const saveProgress = async (payload: SaveProgressPayload): Promise<void> => {
  await post<{ saved: true }>('/v1/game/session/save-progress', { moves: payload.moves });
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const gameOver = async (_payload: GameOverPayload): Promise<GameOverResponse> => {
  return post<GameOverResponse>('/v1/game/session/game-end', {});
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const timeSync = async (_sessionId: string): Promise<TimeSyncResponse> => {
  return get<TimeSyncResponse>('/v1/game/session/time-sync');
};

const getDemoLevels = async (): Promise<LevelData[]> => {
  const data = await get<DemoApiResponse>('/v1/user/demo');
  return data.difficulties
    .flatMap((d) => d.levels)
    .sort((a, b) => a.levelIndex - b.levelIndex)
    .map((l) => ({
      levelIndex: l.levelIndex,
      gridRows: l.gridRows,
      gridColumns: l.gridColumns,
      cardContentType: l.cardContentType as LevelData['cardContentType'],
      previewDurationSeconds: l.previewDurationSeconds,
      mismatchDisplayDurationSeconds: l.mismatchDisplayDurationSeconds,
      cards: l.cards,
    }));
};

const trackEvent = async (payload: AnalyticsEventPayload): Promise<void> => {
  await delay(100 + Math.random() * 100);
  console.info('[gameApi] trackEvent', payload.event, payload.data ?? {});
};

export const gameApi = {
  getGameConfig,
  getStageContent,
  getDemoLevels,
  startGame,
  getCurrentSession,
  completeBoard,
  getNextLevel,
  saveProgress,
  timeSync,
  gameOver,
  trackEvent,
};
