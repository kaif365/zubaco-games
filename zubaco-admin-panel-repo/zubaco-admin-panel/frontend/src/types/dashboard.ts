export interface DashboardStats {
  totalGames: number;
  totalUsers: number;
  activeUsers: number;
  flaggedUsers: number;
  gamesGrowth: number;
  usersGrowth: number;
  activeUsersGrowth: number;
  flaggedGrowth: number;
}

export interface ActivityItem {
  id: string;
  type: "user_joined" | "game_updated" | "user_flagged" | "user_suspended" | "game_added";
  title: string;
  description: string;
  timestamp: string;
  meta?: {
    userId?: string;
    gameId?: string;
    userName?: string;
    gameName?: string;
  };
}
