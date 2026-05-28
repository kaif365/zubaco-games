import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { leaderboardApi } from "../api/leaderboard.api";
import { useLeaderboard } from "../hooks/useLeaderboard";

jest.mock("../api/leaderboard.api");

const mockLeaderboardApi = leaderboardApi as jest.Mocked<typeof leaderboardApi>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const mockResponse = {
  entries: [
    {
      rank: 1,
      playerId: "p1",
      playerName: "Alice",
      score: 9800,
      gamesPlayed: 12,
    },
    {
      rank: 2,
      playerId: "p2",
      playerName: "Bob",
      score: 8500,
      gamesPlayed: 10,
    },
  ],
  total: 2,
  page: 1,
  pageSize: 10,
};

describe("useLeaderboard", () => {
  afterEach(() => jest.clearAllMocks());

  it("fetches leaderboard data successfully", async () => {
    mockLeaderboardApi.getLeaderboard.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useLeaderboard({ gameId: "game-1" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.entries).toHaveLength(2);
    expect(result.current.data?.entries[0].playerName).toBe("Alice");
  });

  it("handles API errors", async () => {
    mockLeaderboardApi.getLeaderboard.mockRejectedValue(
      new Error("Network error"),
    );

    const { result } = renderHook(() => useLeaderboard({ gameId: "game-1" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("does not fetch when gameId is empty", () => {
    const { result } = renderHook(() => useLeaderboard({ gameId: "" }), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockLeaderboardApi.getLeaderboard).not.toHaveBeenCalled();
  });
});
