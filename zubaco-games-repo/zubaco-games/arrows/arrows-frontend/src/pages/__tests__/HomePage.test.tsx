import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act, forwardRef, useImperativeHandle } from "react";

import { GAME_EVENTS } from "@/game/gameTypes";
import { I18nProvider } from "@/lib/i18n/provider";
import HomePage from "@pages/HomePage";

const mockRetry = jest.fn();
const mockNext = jest.fn();
const mockGoto = jest.fn();
const mockGuides = jest.fn();
const mockHint = jest.fn();
const mockSetZoom = jest.fn();

// ── gameApiClient mock ────────────────────────────────────────────────────────
const mockAuth = jest.fn(async () => undefined);
const mockGameStart = jest.fn(async () => ({
  success: true,
  data: {
    sessionId: "session-default",
    expiryAt: new Date(Date.now() + 60_000).toISOString(),
    totalRounds: 1,
    // roundNumber lives inside board, matching actual API shape
    board: {
      id: "board-1",
      roundNumber: 1,
      gridSize: { x: 2, y: 2 },
      arrows: [
        {
          waypoints: [
            { x: 0, y: 0 },
            { x: 0, y: 1 },
          ],
          headDirection: "up" as const,
          color: 3381759,
        },
      ],
    },
  },
}));
const mockSubmitMoves = jest.fn(async () => ({
  success: true,
  data: { processed: 0 },
}));
const mockEndBoard = jest.fn(async () => ({
  success: true,
  data: {
    roundNumber: 1,
    roundScore: 0,
    gameOver: true,
    completed: true,
    score: 0,
  },
}));
const mockEndGame = jest.fn(async () => ({
  success: true,
  message: "GAME_EXPIRED",
  data: {
    status: 3,
    completed: false,
    score: 0,
  },
}));
const mockNextBoard = jest.fn(async () => ({
  success: true,
  // data IS the board — roundNumber is a top-level field, matching actual API shape
  data: {
    id: "board-2",
    roundNumber: 2,
    gridSize: { x: 2, y: 2 },
    arrows: [
      {
        waypoints: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        headDirection: "right" as const,
        color: 3381759,
      },
    ],
  },
}));
const mockGameStatus = jest.fn(async () => ({
  success: true,
  message: "GAME_COMPLETED",
  data: {
    roundNumber: 1,
    roundScore: 0,
    gameOver: true,
    completed: true,
    score: 0,
  },
}));
const mockDemoWithToken = jest.fn(async () => ({
  success: true,
  data: {
    stageId: "test-stage",
    alreadySeen: true,
    levels: [],
  },
}));
const mockApiReset = jest.fn();
const mockSetToken = jest.fn();
const mockGetToken = jest.fn(() => "test-token");
const mockRandomUUID = jest.fn(() => "move-id");

Object.defineProperty(globalThis.crypto, "randomUUID", {
  value: mockRandomUUID,
  configurable: true,
});

jest.mock("embla-carousel-react", () => ({
  __esModule: true,
  default: () => [jest.fn(), null],
}));

jest.mock("@services/gameApiClient", () => ({
  __esModule: true,
  gameApiClient: {
    auth: (...args: []) => mockAuth(...args),
    gameStart: (...args: []) => mockGameStart(...args),
    submitMoves: (...args: [unknown]) => mockSubmitMoves(...args),
    endBoard: (...args: []) => mockEndBoard(...args),
    endGame: (...args: []) => mockEndGame(...args),
    nextBoard: (...args: []) => mockNextBoard(...args),
    gameStatus: (...args: []) => mockGameStatus(...args),
    demoWithToken: (...args: [string]) => mockDemoWithToken(...args),
    reset: () => mockApiReset(),
    setToken: (...args: [string | null]) => mockSetToken(...args),
    getToken: () => mockGetToken(),
  },
  DEFAULT_STAGE_ID: "test-stage",
}));

jest.mock("@components/PhaserGame", () => {
  const MockPhaserGame = forwardRef<unknown, Record<string, never>>(
    (_props, ref) => {
      useImperativeHandle(ref, () => ({
        retry: mockRetry,
        next: mockNext,
        goto: mockGoto,
        guides: mockGuides,
        hint: mockHint,
        setZoom: mockSetZoom,
      }));
      return <div data-testid="phaser-game" />;
    },
  );
  MockPhaserGame.displayName = "MockPhaserGame";
  return { __esModule: true, default: MockPhaserGame };
});

const createRoundStartPayload = (roundNumber: number) => ({
  roundNumber,
  board: {
    id: `board-${roundNumber}`,
    name: `Board ${roundNumber}`,
    gridSize: { x: 2, y: 2 },
    arrows: [
      {
        waypoints: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
        ],
        headDirection: "up" as const,
        color: 3381759,
      },
    ],
  },
});

function renderHomePage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <HomePage />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

function resetMockImplementations() {
  mockRetry.mockReset();
  mockNext.mockReset();
  mockGoto.mockReset();
  mockGuides.mockReset();
  mockHint.mockReset();
  mockSetZoom.mockReset();

  mockAuth.mockReset().mockResolvedValue(undefined);
  mockGameStart.mockReset().mockResolvedValue({
    success: true,
    data: {
      sessionId: "session-default",
      expiryAt: new Date(Date.now() + 60_000).toISOString(),
      totalRounds: 1,
      board: {
        ...createRoundStartPayload(1).board,
        roundNumber: 1,
      },
    },
  });
  mockSubmitMoves.mockReset().mockResolvedValue({
    success: true,
    data: { processed: 0 },
  });
  mockEndBoard.mockReset().mockResolvedValue({
    success: true,
    data: {
      roundNumber: 1,
      roundScore: 0,
      gameOver: true,
      completed: true,
      score: 0,
    },
  });
  mockEndGame.mockReset().mockResolvedValue({
    success: true,
    message: "GAME_EXPIRED",
    data: {
      status: 3,
      completed: false,
      score: 0,
    },
  });
  mockNextBoard.mockReset().mockResolvedValue({
    success: true,
    data: {
      ...createRoundStartPayload(2).board,
      roundNumber: 2,
    },
  });
  mockGameStatus.mockReset().mockResolvedValue({
    success: true,
    message: "GAME_COMPLETED",
    data: {
      roundNumber: 1,
      roundScore: 0,
      gameOver: true,
      completed: true,
      score: 0,
    },
  });
  mockDemoWithToken.mockReset().mockResolvedValue({
    success: true,
    data: {
      stageId: "test-stage",
      alreadySeen: true,
      levels: [],
    },
  });
  mockApiReset.mockReset();
  mockSetToken.mockReset();
  mockGetToken.mockReset().mockReturnValue("test-token");
  mockRandomUUID.mockReset().mockReturnValue("move-id");
}

describe("HomePage", () => {
  beforeEach(() => {
    resetMockImplementations();
    localStorage.clear();
  });

  afterEach(async () => {
    jest.useRealTimers();
    await act(async () => {
      await Promise.resolve();
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  const dispatchGameEvent = (eventName: string, detail?: unknown) => {
    act(() => {
      window.dispatchEvent(new CustomEvent(eventName, { detail }));
    });
  };

  const clickPlayNow = async () => {
    fireEvent.click(
      await screen.findByRole("button", { name: /play now/i }),
    );
  };

  const advanceInstructionSkeleton = async () => {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });
  };

  const seedDemoSession = (roundCount = 1) => {
    localStorage.setItem(
      "arrowgame:demo-session:v1",
      JSON.stringify({
        stageId: "test-stage",
        alreadySeen: true,
        status: "playing",
        boards: Array.from(
          { length: roundCount },
          (_, index) => createRoundStartPayload(index + 1).board,
        ),
        currentBoardIndex: 0,
        capturedAtMs: Date.now(),
      }),
    );
  };

  const startSeededDemo = async () => {
    renderHomePage();
    fireEvent.click(
      await screen.findByRole("button", { name: /learn how to play/i }),
    );
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Hint" })).toBeInTheDocument();
    });
  };

  it("updates HUD from game events", async () => {
    seedDemoSession();
    await startSeededDemo();

    dispatchGameEvent(GAME_EVENTS.LEVEL_LOAD, { level: 3, lives: 2, hints: 1 });

    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  it("sends hint, guide and zoom commands to game bridge", async () => {
    seedDemoSession();
    await startSeededDemo();

    fireEvent.click(screen.getByRole("button", { name: "Hint" }));
    fireEvent.click(screen.getByRole("button", { name: "Toggle guides" }));
    fireEvent.change(screen.getByRole("slider", { name: "Zoom" }), {
      target: { value: "80" },
    });

    expect(mockHint).toHaveBeenCalledTimes(1);
    expect(mockGuides).toHaveBeenCalledTimes(1);
    expect(mockSetZoom).toHaveBeenCalledWith(80);
  });

  it("returns to the instruction screen after the final demo win", async () => {
    seedDemoSession();
    const loadServerListener = jest.fn();
    window.addEventListener(
      GAME_EVENTS.CMD_LOAD_SERVER,
      loadServerListener as EventListener,
    );
    await startSeededDemo();
    loadServerListener.mockClear();

    dispatchGameEvent(GAME_EVENTS.WIN);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /play now/i }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /replay/i })).toBeNull();
    expect(localStorage.getItem("arrowgame:played")).toBe("true");
    expect(loadServerListener).not.toHaveBeenCalled();
    expect(mockRetry).not.toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();

    window.removeEventListener(
      GAME_EVENTS.CMD_LOAD_SERVER,
      loadServerListener as EventListener,
    );
  });

  it("advances middle demo rounds without showing replay", async () => {
    seedDemoSession(2);
    await startSeededDemo();

    dispatchGameEvent(GAME_EVENTS.WIN);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /replay/i })).toBeNull();
    });
    expect(
      screen.queryByRole("button", { name: /start game/i }),
    ).not.toBeInTheDocument();
    expect(mockRetry).not.toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("shows game over overlay and retries", async () => {
    seedDemoSession();
    await startSeededDemo();

    dispatchGameEvent(GAME_EVENTS.GAMEOVER);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it("loads each server round and only completes on the final game-end event", async () => {
    jest.useFakeTimers();
    localStorage.setItem("arrowgame:played", JSON.stringify(true));

    const loadServerListener = jest.fn();
    window.addEventListener(
      GAME_EVENTS.CMD_LOAD_SERVER,
      loadServerListener as EventListener,
    );

    // Game start: returns round 1 board (roundNumber inside board)
    const round1Data = createRoundStartPayload(1);
    mockGameStart.mockResolvedValueOnce({
      success: true,
      data: {
        sessionId: "session-1",
        expiryAt: new Date(Date.now() + 60_000).toISOString(),
        totalRounds: 2,
        board: { ...round1Data.board, roundNumber: 1 },
      },
    });

    renderHomePage();

    await advanceInstructionSkeleton();
    await clickPlayNow();

    // Wait until CMD_LOAD_SERVER fires — this confirms auth+gameStart resolved
    // and phase is "server_game"
    await waitFor(() => {
      expect(mockGameStart).toHaveBeenCalledTimes(1);
    });
    loadServerListener.mockClear();

    expect(mockAuth).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: /play now/i }),
    ).not.toBeInTheDocument();

    // Dispatch WIN for round 1 → endBoard called
    mockEndBoard.mockResolvedValueOnce({
      success: true,
      data: { roundNumber: 1, roundScore: 1000, gameOver: false },
    });
    mockNextBoard.mockResolvedValueOnce({
      success: true,
      // data IS the board
      data: { ...createRoundStartPayload(2).board, roundNumber: 2 },
    });

    dispatchGameEvent(GAME_EVENTS.WIN);

    // GREAT! screen shows with round score
    await waitFor(() => {
      expect(screen.getByText(/great/i)).toBeInTheDocument();
      expect(screen.getByText(/continue to next round/i)).toBeInTheDocument();
    });

    // Advance timer past NEXT_BOARD_DELAY_MS to trigger nextBoard load
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    // Wait until round 2 is loaded via CMD_LOAD_SERVER
    await waitFor(() => {
      expect(loadServerListener).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.queryByText(/great/i)).not.toBeInTheDocument();
    });
    expect(
      (loadServerListener.mock.calls[0][0] as CustomEvent).detail.roundNumber,
    ).toBe(2);
    expect(screen.queryByText("Game Completed")).not.toBeInTheDocument();

    // Dispatch WIN for round 2 → endBoard with gameOver: true
    mockEndBoard.mockResolvedValueOnce({
      success: true,
      data: {
        roundNumber: 2,
        roundScore: 1000,
        gameOver: true,
        completed: true,
        score: 2000,
        roundsCompleted: 2,
        arrowsRemoved: 2,
        totalArrows: 2,
        timeBonus: 120,
      },
    });
    mockGameStatus.mockResolvedValueOnce({
      success: true,
      message: "GAME_COMPLETED",
      data: {
        roundNumber: 2,
        roundScore: 1000,
        gameOver: true,
        completed: true,
        score: 2000,
        roundsCompleted: 2,
        arrowsRemoved: 2,
        totalArrows: 2,
        timeBonus: 120,
      },
    });

    dispatchGameEvent(GAME_EVENTS.WIN);

    // Final round shows the results calculation state briefly
    await waitFor(() => {
      expect(screen.getAllByText(/results/i).length).toBeGreaterThan(0);
    });
    await waitFor(() => {
      expect(mockGameStatus).toHaveBeenCalled();
    });

    // Advance past GAME_END_DELAY_MS to trigger finishServerGame
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });

    await waitFor(() => {
      expect(screen.getByText("YOUR SCORE")).toBeInTheDocument();
    });

    expect(screen.getByText("2000")).toBeInTheDocument();
    expect(mockApiReset).toHaveBeenCalled();

    window.removeEventListener(
      GAME_EVENTS.CMD_LOAD_SERVER,
      loadServerListener as EventListener,
    );
    jest.useRealTimers();
  });

  it("loads a prefetched next board while previous round submission is still pending", async () => {
    localStorage.setItem("arrowgame:played", JSON.stringify(true));

    const loadServerListener = jest.fn();
    window.addEventListener(
      GAME_EVENTS.CMD_LOAD_SERVER,
      loadServerListener as EventListener,
    );

    mockGameStart.mockResolvedValueOnce({
      success: true,
      data: {
        sessionId: "session-prefetch",
        expiryAt: new Date(Date.now() + 60_000).toISOString(),
        totalRounds: 2,
        board: { ...createRoundStartPayload(1).board, roundNumber: 1 },
      },
    });
    mockNextBoard.mockResolvedValueOnce({
      success: true,
      data: { ...createRoundStartPayload(2).board, roundNumber: 2 },
    });

    let resolveSubmitMoves: (() => void) | null = null;
    mockSubmitMoves.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSubmitMoves = () =>
            resolve({ success: true, data: { processed: 1 } });
        }),
    );
    mockEndBoard.mockResolvedValueOnce({
      success: true,
      data: { roundNumber: 1, roundScore: 1000, gameOver: false },
    });

    renderHomePage();
    await advanceInstructionSkeleton();
    await clickPlayNow();

    await waitFor(() => {
      expect(mockGameStart).toHaveBeenCalledTimes(1);
    });
    loadServerListener.mockClear();

    dispatchGameEvent(GAME_EVENTS.ARROW_CLICKED, { x: 0, y: 0 });
    dispatchGameEvent(GAME_EVENTS.ARROWS_PROGRESS, {
      remaining: 1,
      total: 10,
    });

    await waitFor(() => {
      expect(mockNextBoard).toHaveBeenCalledTimes(1);
    });
    expect(mockSubmitMoves).not.toHaveBeenCalled();

    dispatchGameEvent(GAME_EVENTS.WIN);

    await waitFor(() => {
      expect(loadServerListener).toHaveBeenCalledTimes(1);
    });
    expect(
      (loadServerListener.mock.calls[0][0] as CustomEvent).detail.roundNumber,
    ).toBe(2);
    expect(mockSubmitMoves).toHaveBeenCalledTimes(1);
    expect(mockEndBoard).not.toHaveBeenCalled();

    await act(async () => {
      resolveSubmitMoves?.();
    });
    await waitFor(() => {
      expect(mockEndBoard).toHaveBeenCalledTimes(1);
    });

    window.removeEventListener(
      GAME_EVENTS.CMD_LOAD_SERVER,
      loadServerListener as EventListener,
    );
  });

  it("flushes pending moves before ending the active round when time expires", async () => {
    jest.useFakeTimers();
    localStorage.setItem("arrowgame:played", JSON.stringify(true));

    const callOrder: string[] = [];

    mockGameStart.mockResolvedValueOnce({
      success: true,
      data: {
        sessionId: "session-expiring",
        startedAt: new Date(Date.now()).toISOString(),
        expiryAt: new Date(Date.now() + 1_000).toISOString(),
        totalRounds: 1,
        board: { ...createRoundStartPayload(1).board, roundNumber: 1 },
      },
    });
    mockSubmitMoves.mockImplementationOnce(async (moves: unknown) => {
      callOrder.push("submitMoves");
      expect(moves).toEqual([
        expect.objectContaining({ x: 0, y: 0, moveId: expect.any(String) }),
      ]);
      return { success: true, data: { processed: 1 } };
    });
    mockEndBoard.mockImplementationOnce(async () => {
      callOrder.push("endBoard");
      return {
        success: true,
        data: { roundNumber: 1, roundScore: 0, gameOver: true },
      };
    });
    mockEndGame.mockImplementationOnce(async () => {
      callOrder.push("endGame");
      return {
        success: true,
        message: "GAME_EXPIRED",
        data: { status: 3, completed: false, score: 0 },
      };
    });
    mockGameStatus.mockImplementationOnce(async () => {
      callOrder.push("gameStatus");
      return {
        success: true,
        message: "GAME_EXPIRED",
        data: {
          completed: false,
          score: 0,
          roundsCompleted: 0,
          arrowsRemoved: 1,
          totalArrows: 1,
        },
      };
    });

    renderHomePage();
    await advanceInstructionSkeleton();
    await clickPlayNow();

    await waitFor(() => {
      expect(mockGameStart).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(GAME_EVENTS.ARROW_CLICKED, {
          detail: { x: 0, y: 0 },
        }),
      );
    });

    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });

    await waitFor(() => {
      expect(mockSubmitMoves).toHaveBeenCalledTimes(1);
      expect(mockEndBoard).toHaveBeenCalledTimes(1);
      expect(mockEndGame).not.toHaveBeenCalled();
      expect(mockGameStatus).toHaveBeenCalledTimes(1);
    });
    expect(callOrder).toEqual(["submitMoves", "endBoard", "gameStatus"]);
  });

  it("timestamps new moves from the server session start plus local elapsed time", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-29T00:00:30.000Z"));
    localStorage.setItem("arrowgame:played", JSON.stringify(true));

    mockGameStart.mockResolvedValueOnce({
      success: true,
      data: {
        sessionId: "session-clock-skew",
        startedAt: "2026-04-29T00:00:00.000Z",
        expiryAt: "2026-04-29T00:05:00.000Z",
        totalRounds: 1,
        board: { ...createRoundStartPayload(1).board, roundNumber: 1 },
      },
    });
    mockSubmitMoves.mockImplementationOnce(async (moves: unknown) => {
      expect(moves).toEqual([
        expect.objectContaining({
          x: 0,
          y: 0,
          clickedAt: "2026-04-29T00:00:02.000Z",
          moveId: expect.any(String),
        }),
      ]);
      return { success: true, data: { processed: 1 } };
    });
    mockEndBoard.mockResolvedValueOnce({
      success: true,
      data: {
        roundNumber: 1,
        roundScore: 1000,
        gameOver: true,
        completed: true,
        score: 1000,
      },
    });
    mockGameStatus.mockResolvedValueOnce({
      success: true,
      message: "GAME_COMPLETED",
      data: {
        completed: true,
        score: 1000,
        roundsCompleted: 1,
        arrowsRemoved: 1,
        totalArrows: 1,
      },
    });

    renderHomePage();
    await clickPlayNow();

    await waitFor(() => {
      expect(mockGameStart).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      jest.advanceTimersByTime(2_000);
    });

    dispatchGameEvent(GAME_EVENTS.ARROW_CLICKED, { x: 0, y: 0 });
    dispatchGameEvent(GAME_EVENTS.WIN);

    await waitFor(() => {
      expect(mockSubmitMoves).toHaveBeenCalledTimes(1);
    });
  });

  it("keeps the original client clock anchor when timestamping moves after reload", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-29T00:01:30.000Z"));
    localStorage.setItem("arrowgame:played", JSON.stringify(true));
    localStorage.setItem(
      "arrowgame:live-session:v1",
      JSON.stringify({
        token: "stored-token",
        stageId: "stored-stage",
        sessionId: "stored-session",
        currentRound: 1,
        totalRounds: 1,
        startedAt: "2026-04-29T00:00:00.000Z",
        clientStartedAtMs: new Date("2026-04-29T00:00:30.000Z").getTime(),
        expiryAt: "2026-04-29T00:05:00.000Z",
        capturedAtMs: new Date("2026-04-29T00:01:00.000Z").getTime(),
        board: createRoundStartPayload(1).board,
        phase: "server_game",
        pendingMovesByRound: {},
        removedArrowIdsByRound: {},
        lastStatusPayload: null,
      }),
    );

    mockGameStart.mockResolvedValueOnce({
      success: true,
      data: {
        sessionId: "stored-session",
        startedAt: "2026-04-29T00:00:00.000Z",
        expiryAt: "2026-04-29T00:05:00.000Z",
        totalRounds: 1,
        board: { ...createRoundStartPayload(1).board, roundNumber: 1 },
      },
    });
    mockSubmitMoves.mockImplementationOnce(async (moves: unknown) => {
      expect(moves).toEqual([
        expect.objectContaining({
          x: 0,
          y: 0,
          clickedAt: "2026-04-29T00:01:02.000Z",
          moveId: expect.any(String),
        }),
      ]);
      return { success: true, data: { processed: 1 } };
    });
    mockEndBoard.mockResolvedValueOnce({
      success: true,
      data: {
        roundNumber: 1,
        roundScore: 1000,
        gameOver: true,
        completed: true,
        score: 1000,
      },
    });
    mockGameStatus.mockResolvedValueOnce({
      success: true,
      message: "GAME_COMPLETED",
      data: {
        completed: true,
        score: 1000,
        roundsCompleted: 1,
        arrowsRemoved: 1,
        totalArrows: 1,
      },
    });

    renderHomePage();

    await waitFor(() => {
      expect(mockGameStart).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      jest.advanceTimersByTime(2_000);
    });

    dispatchGameEvent(GAME_EVENTS.ARROW_CLICKED, { x: 0, y: 0 });
    dispatchGameEvent(GAME_EVENTS.WIN);

    await waitFor(() => {
      expect(mockSubmitMoves).toHaveBeenCalledTimes(1);
    });
  });

  it("recovers an expired stored session by flushing moves and ending the round before status", async () => {
    localStorage.setItem("arrowgame:played", JSON.stringify(true));

    const callOrder: string[] = [];
    localStorage.setItem(
      "arrowgame:live-session:v1",
      JSON.stringify({
        token: "stored-token",
        stageId: "stored-stage",
        sessionId: "stored-session",
        currentRound: 3,
        totalRounds: 5,
        startedAt: new Date(Date.now() - 61_000).toISOString(),
        expiryAt: new Date(Date.now() - 1_000).toISOString(),
        capturedAtMs: Date.now() - 1_000,
        board: createRoundStartPayload(3).board,
        phase: "server_game",
        pendingMovesByRound: {
          "3": [
            {
              x: 1,
              y: 0,
              clickedAt: "2026-04-29T00:00:00.000Z",
              moveId: "stored-move",
            },
          ],
        },
        removedArrowIdsByRound: {},
        lastStatusPayload: null,
      }),
    );

    mockSubmitMoves.mockImplementationOnce(async (moves: unknown) => {
      callOrder.push("submitMoves");
      expect(moves).toEqual([
        {
          x: 1,
          y: 0,
          clickedAt: "2026-04-29T00:00:00.000Z",
          moveId: "stored-move",
        },
      ]);
      return { success: true, data: { processed: 1 } };
    });
    mockEndBoard.mockImplementationOnce(async () => {
      callOrder.push("endBoard");
      return {
        success: true,
        data: { roundNumber: 3, roundScore: 0, gameOver: true },
      };
    });
    mockEndGame.mockImplementationOnce(async () => {
      callOrder.push("endGame");
      return {
        success: true,
        message: "GAME_EXPIRED",
        data: { status: 3, completed: false, score: 125 },
      };
    });
    mockGameStatus.mockImplementationOnce(async () => {
      callOrder.push("gameStatus");
      return {
        success: true,
        message: "GAME_EXPIRED",
        data: {
          status: 3,
          completed: false,
          score: 125,
          roundsCompleted: 2,
          arrowsRemoved: 7,
          totalArrows: 12,
        },
      };
    });

    renderHomePage();

    await waitFor(() => {
      expect(mockSubmitMoves).toHaveBeenCalledTimes(1);
      expect(mockEndBoard).toHaveBeenCalledTimes(1);
      expect(mockEndGame).not.toHaveBeenCalled();
      expect(mockGameStatus).toHaveBeenCalledTimes(1);
    });

    expect(mockSetToken).toHaveBeenCalledWith("stored-token");
    expect(mockGameStart).not.toHaveBeenCalled();
    expect(callOrder).toEqual(["submitMoves", "endBoard", "gameStatus"]);
    expect(await screen.findByText("YOUR SCORE")).toBeInTheDocument();
    expect(await screen.findByText("125")).toBeInTheDocument();
  });

  it("flushes stored moves when game-start returns result processing during recovery", async () => {
    localStorage.setItem("arrowgame:played", JSON.stringify(true));

    const callOrder: string[] = [];
    localStorage.setItem(
      "arrowgame:live-session:v1",
      JSON.stringify({
        token: "stored-token",
        stageId: "stored-stage",
        sessionId: "stored-session",
        currentRound: 2,
        totalRounds: 4,
        startedAt: new Date(Date.now() - 57_000).toISOString(),
        expiryAt: new Date(Date.now() + 1_000).toISOString(),
        capturedAtMs: Date.now() - 1_000,
        board: createRoundStartPayload(2).board,
        phase: "server_game",
        pendingMovesByRound: {
          "2": [
            {
              x: 0,
              y: 1,
              clickedAt: "2026-04-29T00:00:01.000Z",
              moveId: "stored-processing-move",
            },
          ],
        },
        removedArrowIdsByRound: {},
        lastStatusPayload: null,
      }),
    );

    mockGameStart.mockImplementationOnce(async () => {
      callOrder.push("gameStart");
      return {
        success: true,
        statusCode: 200,
        message: "RESULT_PROCESSING",
        data: { status: 4 },
      };
    });
    mockSubmitMoves.mockImplementationOnce(async (moves: unknown) => {
      callOrder.push("submitMoves");
      expect(moves).toEqual([
        {
          x: 0,
          y: 1,
          clickedAt: "2026-04-29T00:00:01.000Z",
          moveId: "stored-processing-move",
        },
      ]);
      return { success: true, data: { processed: 1 } };
    });
    mockEndBoard.mockImplementationOnce(async () => {
      callOrder.push("endBoard");
      return {
        success: true,
        data: { roundNumber: 2, roundScore: 0, gameOver: true },
      };
    });
    mockEndGame.mockImplementationOnce(async () => {
      callOrder.push("endGame");
      return {
        success: true,
        message: "GAME_EXPIRED",
        data: { status: 3, completed: false, score: 90 },
      };
    });
    mockGameStatus.mockImplementationOnce(async () => {
      callOrder.push("gameStatus");
      return {
        success: true,
        message: "GAME_EXPIRED",
        data: {
          status: 3,
          completed: false,
          score: 90,
          roundsCompleted: 1,
          arrowsRemoved: 3,
          totalArrows: 8,
        },
      };
    });

    renderHomePage();

    await waitFor(() => {
      expect(mockGameStart).toHaveBeenCalledTimes(1);
      expect(mockSubmitMoves).toHaveBeenCalledTimes(1);
      expect(mockEndBoard).toHaveBeenCalledTimes(1);
      expect(mockEndGame).not.toHaveBeenCalled();
      expect(mockGameStatus).toHaveBeenCalledTimes(1);
    });

    expect(callOrder).toEqual([
      "gameStart",
      "submitMoves",
      "endBoard",
      "gameStatus",
    ]);
    expect(await screen.findByText("YOUR SCORE")).toBeInTheDocument();
    expect(await screen.findByText("90")).toBeInTheDocument();
  });

  it("fetches final status and clears stored session when a game API asks clearData", async () => {
    localStorage.setItem("arrowgame:played", JSON.stringify(true));
    localStorage.setItem(
      "arrowgame:live-session:v1",
      JSON.stringify({
        token: "stored-token",
        stageId: "test-stage",
        sessionId: "missing-session",
        currentRound: 1,
        totalRounds: 1,
        startedAt: new Date(Date.now() - 10_000).toISOString(),
        expiryAt: new Date(Date.now() + 60_000).toISOString(),
        capturedAtMs: Date.now(),
        board: createRoundStartPayload(1).board,
        phase: "server_game",
        pendingMovesByRound: {},
        removedArrowIdsByRound: {},
        lastStatusPayload: null,
      }),
    );

    mockGameStart.mockResolvedValueOnce({
      success: false,
      statusCode: 404,
      message: "Game session not found",
      data: { clearData: true },
    });
    mockGameStatus.mockResolvedValueOnce({
      success: true,
      message: "GAME_EXPIRED",
      data: {
        status: 3,
        completed: false,
        score: 777,
        roundsCompleted: 1,
      },
    });

    renderHomePage();

    await waitFor(() => {
      expect(mockGameStatus).toHaveBeenCalledTimes(1);
    });

    expect(localStorage.getItem("arrowgame:live-session:v1")).toBeNull();
    expect(await screen.findByText("YOUR SCORE")).toBeInTheDocument();
    expect(await screen.findByText("777")).toBeInTheDocument();
  });

  it("flushes stored moves when recovered board data is already expired", async () => {
    localStorage.setItem("arrowgame:played", JSON.stringify(true));

    const callOrder: string[] = [];
    localStorage.setItem(
      "arrowgame:live-session:v1",
      JSON.stringify({
        token: "stored-token",
        stageId: "stored-stage",
        sessionId: "stored-session",
        currentRound: 1,
        totalRounds: 3,
        startedAt: new Date(Date.now() - 58_000).toISOString(),
        expiryAt: new Date(Date.now() + 2_000).toISOString(),
        capturedAtMs: Date.now() - 1_000,
        board: createRoundStartPayload(1).board,
        phase: "server_game",
        pendingMovesByRound: {
          "1": [
            {
              x: 1,
              y: 1,
              clickedAt: "2026-04-29T00:00:02.000Z",
              moveId: "stored-active-expired-move",
            },
          ],
        },
        removedArrowIdsByRound: {},
        lastStatusPayload: null,
      }),
    );

    mockGameStart.mockImplementationOnce(async () => {
      callOrder.push("gameStart");
      return {
        success: true,
        statusCode: 200,
        message: "Success",
        data: {
          status: 1,
          sessionId: "stored-session",
          startedAt: new Date(Date.now() - 60_000).toISOString(),
          expiryAt: new Date(Date.now() - 1_000).toISOString(),
          totalRounds: 3,
          board: { ...createRoundStartPayload(1).board, roundNumber: 1 },
        },
      };
    });
    mockSubmitMoves.mockImplementationOnce(async (moves: unknown) => {
      callOrder.push("submitMoves");
      expect(moves).toEqual([
        {
          x: 1,
          y: 1,
          clickedAt: "2026-04-29T00:00:02.000Z",
          moveId: "stored-active-expired-move",
        },
      ]);
      return { success: true, data: { processed: 1 } };
    });
    mockEndBoard.mockImplementationOnce(async () => {
      callOrder.push("endBoard");
      return {
        success: true,
        data: { roundNumber: 1, roundScore: 0, gameOver: true },
      };
    });
    mockEndGame.mockImplementationOnce(async () => {
      callOrder.push("endGame");
      return {
        success: true,
        message: "GAME_EXPIRED",
        data: { status: 3, completed: false, score: 45 },
      };
    });
    mockGameStatus.mockImplementationOnce(async () => {
      callOrder.push("gameStatus");
      return {
        success: true,
        message: "GAME_EXPIRED",
        data: {
          status: 3,
          completed: false,
          score: 45,
          roundsCompleted: 0,
          arrowsRemoved: 2,
          totalArrows: 6,
        },
      };
    });

    renderHomePage();

    await waitFor(() => {
      expect(mockGameStart).toHaveBeenCalledTimes(1);
      expect(mockSubmitMoves).toHaveBeenCalledTimes(1);
      expect(mockEndBoard).toHaveBeenCalledTimes(1);
      expect(mockEndGame).not.toHaveBeenCalled();
      expect(mockGameStatus).toHaveBeenCalledTimes(1);
    });

    expect(callOrder).toEqual([
      "gameStart",
      "submitMoves",
      "endBoard",
      "gameStatus",
    ]);
    expect(await screen.findByText("YOUR SCORE")).toBeInTheDocument();
    expect(await screen.findByText("45")).toBeInTheDocument();
  });
});
