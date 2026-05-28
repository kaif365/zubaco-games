import type {
  CurrentSessionResponse,
  GameConfigResponse,
  GameOverRequest,
  GameOverResponse,
  GameStartRequest,
  GameStartResponse,
  NextSequenceRequest,
  NextSequenceResponse,
  TimeSyncResponse,
  ValidateRequest,
  ValidateResponse,
} from '@/types/api.types';
import { get, post } from '@services/httpClient';

export const gameApi = {
  getConfig: (stageId: string): Promise<GameConfigResponse> =>
    get<GameConfigResponse>(`/v1/game/config/${stageId}`),

  start: (body: GameStartRequest): Promise<GameStartResponse> =>
    post<GameStartResponse>('/v1/game/start', body),

  nextSequence: (body: NextSequenceRequest): Promise<NextSequenceResponse> =>
    post<NextSequenceResponse>('/v1/game/next-sequence', body),

  prevSequence: (body: NextSequenceRequest): Promise<NextSequenceResponse> =>
    post<NextSequenceResponse>('/v1/game/prev-sequence', body),

  validate: (body: ValidateRequest): Promise<ValidateResponse> =>
    post<ValidateResponse>('/v1/game/validate', body),

  gameOver: (body: GameOverRequest): Promise<GameOverResponse> =>
    post<GameOverResponse>('/v1/game/game-over', body),

  timeSync: (gameSessionId: string): Promise<TimeSyncResponse> =>
    get<TimeSyncResponse>('/v1/game/time-sync', { params: { gameSessionId } }),

  currentSession: (stageId: string, sessionId: string): Promise<CurrentSessionResponse> =>
    get<CurrentSessionResponse>('/v1/game/current-session', { params: { stageId, sessionId } }),
};
