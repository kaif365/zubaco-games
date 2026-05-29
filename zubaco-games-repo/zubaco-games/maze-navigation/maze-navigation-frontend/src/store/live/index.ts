import { GAME_SESSION_STATUS } from "@/constants/game-session-status";
import { MAZE_START_TIMER } from "@/constants/maze";
import { logger } from "@/lib/default-logger";
import gameService from "@/services/api/game";
import type {
  EndBoardResponse,
  EndGameResponse,
  GameMazeDto,
  GameScoreboardDto,
  GameSessionResponse,
  GameSessionStatusCode,
  NextBoardResponse,
  SubmitMovesRequest,
} from "@/types/api/game";
import { MazeGamePhase } from "@/types/maze-phase";
import type { StageId } from "@/types/stage-theme";
import { normalizeStageId } from "@/utils/stage/stage-utils";
import axios from "axios";
import { create, type StateCreator } from "zustand";

export interface LiveGameResult {
  stage: StageId;
  score: number;
  completed: number;
  total: number;
  variant: "success" | "failure";
}

export interface LiveSessionSlice {
  session: GameSessionResponse | null;
  hasActiveLiveSession: boolean;
  isStarting: boolean;
  isSyncing: boolean;
}

export interface LiveHudSlice {
  phase: MazeGamePhase;
  score: number;
  timer: number;
  level: number;
}

interface LiveActions {
  setResult: (payload: LiveGameResult) => void;
  clear: () => void;
  setPhase: (phase: MazeGamePhase) => void;
  setScore: (score: number) => void;
  setTimer: (timer: number) => void;
  decrementTimer: () => void;
  startLivePlaying: (
    roundNumber: number | undefined,
    timerSeconds: number,
    score: number,
  ) => void;
  finishLiveSuccess: (totalScore: number) => void;
  /** Writes terminal result payload from current live session HUD state. */
  publishTerminalResult: (
    stage: StageId,
    variant: LiveGameResult["variant"],
  ) => void;
  setSession: (session: GameSessionResponse | null) => void;
  clearLiveSession: () => void;
  /** Clears stale WIN/LOSE HUD from a prior visit so /game bootstrap can run. */
  prepareLiveGameRouteEntry: (stageLevel: StageId) => void;
  startGame: () => Promise<GameSessionResponse>;
  fetchStatus: () => Promise<GameSessionResponse | null>;
  applyStatusOrThrow: (data: GameSessionResponse) => void;
  setMaze: (maze: GameMazeDto) => void;
  setScoreboard: (scoreboard: GameScoreboardDto) => void;
  setExpiryAt: (expiryAt: string) => void;
  submitMoves: (body: SubmitMovesRequest) => Promise<void>;
  advanceRoundAfterReachingEnd: () => Promise<{
    nextMaze: NextBoardResponse | null;
    endBoard: EndBoardResponse;
    endGame: EndGameResponse | null;
  }>;
  endGameEarly: (options?: {
    refreshStatus?: boolean;
  }) => Promise<EndGameResponse | null>;
}

export type LiveStore = LiveSessionSlice &
  LiveHudSlice & {
    result: LiveGameResult | null;
  } & LiveActions;

const sessionInitial: LiveSessionSlice = {
  session: null,
  hasActiveLiveSession: false,
  isStarting: false,
  isSyncing: false,
};

const hudInitial: LiveHudSlice = {
  phase: MazeGamePhase.START,
  score: 0,
  timer: MAZE_START_TIMER,
  level: 1,
};

function isSessionActive(status: GameSessionStatusCode): boolean {
  return status === GAME_SESSION_STATUS.STARTED;
}

function isSessionTerminal(status: GameSessionStatusCode): boolean {
  return (
    status === GAME_SESSION_STATUS.ENDED ||
    status === GAME_SESSION_STATUS.EXPIRED ||
    status === GAME_SESSION_STATUS.RESULT_PROCESSING ||
    status === GAME_SESSION_STATUS.MANUALLY_ENDED
  );
}

function resolveRoundsProgress(data: {
  status: number;
  totalRounds: number;
  completedBoards?: number;
}): { total: number; completed: number } {
  const total = Math.max(1, data.totalRounds);
  if (typeof data.completedBoards === "number") {
    return {
      total,
      completed: Math.min(Math.max(0, data.completedBoards), total),
    };
  }
  if (data.status === GAME_SESSION_STATUS.ENDED) {
    return { total, completed: total };
  }
  return { total, completed: 0 };
}

const liveStoreSlice: StateCreator<LiveStore> = (set, get) => ({
  ...sessionInitial,
  ...hudInitial,
  result: null,

  setResult: (payload) => set({ result: payload }),
  clear: () => set({ result: null }),

  setPhase: (phase) => set({ phase }),
  setScore: (score) => set({ score }),
  setTimer: (timer) => set({ timer }),
  decrementTimer: () =>
    set((state) => ({ timer: Math.max(0, state.timer - 1) })),
  startLivePlaying: (roundNumber, timerSeconds, score) =>
    set({
      phase: MazeGamePhase.PLAYING,
      level: Math.max(1, roundNumber ?? hudInitial.level),
      timer: Math.max(0, timerSeconds),
      score,
    }),
  finishLiveSuccess: (totalScore) =>
    set({
      phase: MazeGamePhase.WIN,
      score: totalScore,
    }),

  publishTerminalResult: (stage, variant) => {
    const state = get();
    const stageId = normalizeStageId(stage);
    const rounds =
      state.session === null
        ? { total: 1, completed: variant === "success" ? 1 : 0 }
        : resolveRoundsProgress({
            status: state.session.status,
            totalRounds: state.session.totalRounds,
            completedBoards: state.session.completedBoards,
          });
    const completedGames =
      variant === "success"
        ? rounds.total
        : Math.min(rounds.completed, rounds.total);
    set({
      result: {
        stage: stageId,
        score: state.score,
        completed: completedGames,
        total: rounds.total,
        variant,
      },
      phase: variant === "success" ? MazeGamePhase.WIN : MazeGamePhase.LOSE,
    });
  },

  setSession: (session) =>
    set({
      session,
      hasActiveLiveSession: session !== null && isSessionActive(session.status),
    }),

  clearLiveSession: () =>
    set({
      ...sessionInitial,
      phase: MazeGamePhase.START,
    }),

  prepareLiveGameRouteEntry: (stageLevel) => {
    void stageLevel;
    const { phase } = get();
    if (phase !== MazeGamePhase.WIN && phase !== MazeGamePhase.LOSE) {
      return;
    }
    set({
      phase: MazeGamePhase.START,
      score: 0,
      timer: MAZE_START_TIMER,
      level: 1,
    });
  },

  applyStatusOrThrow: (data) => {
    if (isSessionTerminal(data.status)) {
      set({
        session: data,
        hasActiveLiveSession: false,
      });
      return;
    }
    if (!isSessionActive(data.status)) {
      logger.error("Unexpected game status", { status: data.status });
      throw new Error("Unexpected game status");
    }
    set({
      session: data,
      hasActiveLiveSession: true,
    });
  },

  startGame: async () => {
    set({ isStarting: true });
    try {
      const data = await gameService.gameStart();
      get().applyStatusOrThrow(data);
      return data;
    } finally {
      set({ isStarting: false });
    }
  },

  fetchStatus: async () => {
    set({ isSyncing: true });
    try {
      const data = await gameService.getStatus();
      get().applyStatusOrThrow(data);
      return data;
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        set({
          session: null,
          hasActiveLiveSession: false,
        });
        return null;
      }
      throw e;
    } finally {
      set({ isSyncing: false });
    }
  },

  setMaze: (maze) =>
    set((state) =>
      state.session
        ? {
            session: { ...state.session, maze },
            level: maze.roundNumber,
          }
        : state,
    ),

  setScoreboard: (scoreboard) =>
    set((state) =>
      state.session ? { session: { ...state.session, scoreboard } } : state,
    ),

  setExpiryAt: (expiryAt) =>
    set((state) =>
      state.session ? { session: { ...state.session, expiryAt } } : state,
    ),

  submitMoves: async (body) => {
    const res = await gameService.submitMoves(body);
    set((state) =>
      state.session
        ? {
            session: {
              ...state.session,
              startedAt: res.startedAt,
              expiryAt: res.expiryAt,
            },
          }
        : state,
    );
  },

  advanceRoundAfterReachingEnd: async () => {
    const nextMaze = await gameService.nextBoard();

    if (nextMaze !== null) {
      const endBoard = await gameService.endBoard();
      let endGame: EndGameResponse | null = null;
      if (endBoard.gameOver) {
        endGame = await gameService.endGame();
      }
      try {
        await get().fetchStatus();
      } catch {
        // keep nextMaze from next-board; status may lag briefly
      }
      set((state) => {
        if (!state.session) {
          return state;
        }
        const nextScoreboard =
          endGame === null
            ? state.session.scoreboard
            : {
                ...state.session.scoreboard,
                totalScore: endGame.totalScore,
                timeBonus: endGame.timeBonus,
              };
        return {
          session: {
            ...state.session,
            maze: nextMaze,
            scoreboard: nextScoreboard,
          },
          hasActiveLiveSession: !endBoard.gameOver,
          level: nextMaze.roundNumber,
        };
      });
      return { nextMaze, endBoard, endGame };
    }

    const endBoard = await gameService.endBoard();
    let endGame: EndGameResponse | null = null;
    if (endBoard.gameOver) {
      endGame = await gameService.endGame();
    }

    let statusData: GameSessionResponse | null = null;
    try {
      statusData = await get().fetchStatus();
    } catch {
      // Status unavailable; merge end-board score into existing session below.
    }

    if (!statusData) {
      set((state) => {
        if (!state.session) {
          return state;
        }
        const nextScoreboard =
          endGame === null
            ? state.session.scoreboard
            : {
                ...state.session.scoreboard,
                totalScore: endGame.totalScore,
                timeBonus: endGame.timeBonus,
              };
        return {
          session: {
            ...state.session,
            maze: state.session.maze,
            scoreboard: nextScoreboard,
          },
          hasActiveLiveSession: !endBoard.gameOver,
        };
      });
      return { nextMaze, endBoard, endGame };
    }

    if (isSessionTerminal(statusData.status)) {
      set({
        phase:
          statusData.status === GAME_SESSION_STATUS.ENDED
            ? MazeGamePhase.WIN
            : MazeGamePhase.LOSE,
        score: statusData.scoreboard.totalScore,
      });
    }

    return { nextMaze, endBoard, endGame };
  },

  endGameEarly: async (options) => {
    const refreshStatus = options?.refreshStatus !== false;
    if (!get().hasActiveLiveSession) {
      return null;
    }
    const endGame = await gameService.endGame();
    if (!endGame) {
      set({ hasActiveLiveSession: false });
      return null;
    }
    set((state) => {
      if (!state.session) {
        return { hasActiveLiveSession: false };
      }
      return {
        hasActiveLiveSession: false,
        session: {
          ...state.session,
          scoreboard: {
            ...state.session.scoreboard,
            totalScore: endGame.totalScore,
            timeBonus: endGame.timeBonus,
          },
        },
      };
    });
    if (refreshStatus) {
      try {
        await get().fetchStatus();
      } catch {
        // Status may lag after manual end-game; local session already updated.
      }
    }
    return endGame;
  },
});

export const useLiveStore = create(liveStoreSlice);
