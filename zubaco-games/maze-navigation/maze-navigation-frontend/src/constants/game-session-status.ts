/** `GET /game/status` and session payloads — matches backend `GAME_SESSION_STATUS`. */
export const GAME_SESSION_STATUS = {
  STARTED: 1,
  ENDED: 2,
  EXPIRED: 3,
  RESULT_PROCESSING: 4,
  MANUALLY_ENDED: 5,
} as const;

export type GameSessionStatusValue =
  (typeof GAME_SESSION_STATUS)[keyof typeof GAME_SESSION_STATUS];
