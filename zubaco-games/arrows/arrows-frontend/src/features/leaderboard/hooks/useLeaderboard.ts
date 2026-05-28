import { useQuery } from "@tanstack/react-query";

import { leaderboardApi } from "../api/leaderboard.api";
import type { LeaderboardQueryParams } from "../types/leaderboard.types";

export const leaderboardKeys = {
  all: ["leaderboard"] as const,
  byGame: (gameId: string) => [...leaderboardKeys.all, gameId] as const,
  paged: (params: LeaderboardQueryParams) =>
    [
      ...leaderboardKeys.byGame(params.gameId),
      params.page,
      params.pageSize,
    ] as const,
};

export function useLeaderboard(params: LeaderboardQueryParams) {
  return useQuery({
    queryKey: leaderboardKeys.paged(params),
    queryFn: () => leaderboardApi.getLeaderboard(params),
    enabled: Boolean(params.gameId),
    staleTime: 1000 * 30,
  });
}
