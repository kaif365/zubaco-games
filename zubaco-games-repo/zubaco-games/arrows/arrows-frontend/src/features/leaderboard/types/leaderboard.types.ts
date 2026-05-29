export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  score: number;
  gamesPlayed: number;
  avatarUrl?: string;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LeaderboardQueryParams {
  gameId: string;
  page?: number;
  pageSize?: number;
}
