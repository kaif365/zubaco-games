import { get } from '@services/httpClient';

import type { LeaderboardQueryParams, LeaderboardResponse } from '../types/leaderboard.types';

export const leaderboardApi = {
  getLeaderboard: (params: LeaderboardQueryParams): Promise<LeaderboardResponse> =>
    get<LeaderboardResponse>(`/games/${params.gameId}/leaderboard`, {
      params: { page: params.page ?? 1, pageSize: params.pageSize ?? 10 },
    }),
};
