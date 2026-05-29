export type GameDirection = "up" | "down" | "left" | "right";

export interface GridPos {
  x: number;
  y: number;
}

export interface ArrowPathData {
  waypoints: GridPos[]; // grid coords TAIL → HEAD
  headDirection: GameDirection;
  color: number; // 0xRRGGBB
  arrowId?: string;
  isRemoved?: boolean;
}

export interface LevelData {
  id: number;
  name: string;
  gridSize: GridPos; // { x: cols, y: rows }
  arrows: ArrowPathData[];
}

// ── Server board types (mirroring the game API response) ─────────────────
export interface ServerArrow {
  waypoints: GridPos[];
  headDirection: GameDirection;
  color: number; // raw int, e.g. 3381759 == 0x33AEBF
  arrowId?: string;
  isRemoved?: boolean;
}

export interface ServerBoard {
  id: string;
  name: string;
  gridSize: GridPos;
  timeLimit?: number;
  arrows: ServerArrow[];
}

export interface ServerEventPayload<TData = unknown> {
  success: boolean;
  statusCode?: number;
  message?: string;
  data?: TData;
}

export interface ServerGameStartData {
  gameSessionId: string;
  expiryAt: string;
  totalRounds?: number;
}

export interface ServerRoundStartData {
  roundNumber: number;
  board: ServerBoard;
}

export interface ServerRoundEndData {
  roundNumber: number;
  roundScore: number;
}

export interface ServerRoundScore {
  roundNumber: number;
  score: number;
}

export interface ServerGameEndData {
  completed: boolean;
  score: number;
  timeTakenSeconds?: number;
  roundsCompleted?: number;
  arrowsRemoved: number;
  totalArrows: number;
  roundScores?: ServerRoundScore[];
  timeBonus?: number;
}

export type ServerGameStartPayload = ServerEventPayload<ServerGameStartData>;
export type ServerRoundStartPayload = ServerEventPayload<ServerRoundStartData>;
export type ServerRoundEndPayload = ServerEventPayload<ServerRoundEndData>;
export type ServerGameEndPayload = ServerEventPayload<ServerGameEndData>;

// Events dispatched on window for React ↔ Phaser comms
export const GAME_EVENTS = {
  SCENE_READY: "arrowgame:sceneready",
  LEVEL_LOADING: "arrowgame:levelloading", // dispatched before heavy setup begins
  LEVEL_LOAD: "arrowgame:levelload", // detail: { level, lives, hints, total }
  BOARD_READY: "arrowgame:boardready", // dispatched after arrows finish initial render/intro
  LIVES: "arrowgame:lives", // detail: number
  HINTS: "arrowgame:hints", // detail: number
  WIN: "arrowgame:win", // detail: levelIndex
  GAMEOVER: "arrowgame:gameover",
  CMD_RETRY: "arrowgame:cmd:retry",
  CMD_NEXT: "arrowgame:cmd:next",
  CMD_GOTO: "arrowgame:cmd:goto", // detail: levelIndex
  CMD_GUIDES: "arrowgame:cmd:guides",
  CMD_HINT: "arrowgame:cmd:hint",
  CMD_DEMO_HINT_CLICK: "arrowgame:cmd:demohintclick",
  CMD_DEMO_WRONG_CLICK: "arrowgame:cmd:demowrongclick",
  CMD_DEMO_LOCK: "arrowgame:cmd:demolock",
  CMD_DEMO_UNLOCK: "arrowgame:cmd:demounlock",
  CMD_AUTOPLAY: "arrowgame:cmd:autoplay",
  CMD_ZOOM: "arrowgame:cmd:zoom",
  CMD_SET_MUSIC_VOL: "arrowgame:cmd:setmusicvol", // detail: number (0–1)
  CMD_SET_SFX_VOL: "arrowgame:cmd:setsfxvol", // detail: number (0–1)
  // Server-mode events
  CMD_LOAD_LEVEL_DATA: "arrowgame:cmd:loadleveldata", // detail: LevelData
  CMD_LOAD_SERVER: "arrowgame:cmd:loadserver", // detail: ServerRoundStartData
  ARROW_CLICKED: "arrowgame:arrowclicked", // detail: GridPos  (Phaser→React)
  ARROW_CLEARED: "arrowgame:arrowcleared", // detail: GridPos (Phaser to React)
  SERVER_ACK: "arrowgame:serverack", // detail: ServerClickAck
  TIMER_TICK: "arrowgame:timertick", // detail: number (seconds left)
  ARROWS_PROGRESS: "arrowgame:arrowsprogress", // detail: { remaining: number; total: number }
  COLLISION_GLOW: "arrowgame:collisionglow", // no detail — triggers full-screen red flash
  ZOOM_CHANGED: "arrowgame:zoomchanged", // detail: number (0–100 slider value)
} as const;

export interface ServerClickAck {
  success: boolean;
  reason?: string; // "EMPTY_CELL" | "BLOCKED" etc.
  remainingCount: number;
  clickedPos: GridPos; // echoed back so scene knows which arrow
}
