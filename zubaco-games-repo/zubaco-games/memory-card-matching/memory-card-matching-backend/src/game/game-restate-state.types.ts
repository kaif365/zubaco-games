import type { ActiveGameSessionState } from "./types/game.types";

export const STATE_KEY_SESSION = "session" as const;

export type RestateSessionState = ActiveGameSessionState;
