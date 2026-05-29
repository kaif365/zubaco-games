import type { DashboardStats, ActivityItem } from "@/types/dashboard";

export const MOCK_DASHBOARD_STATS: DashboardStats = {
  totalGames: 15,
  totalUsers: 1284,
  activeUsers: 847,
  flaggedUsers: 8,
  gamesGrowth: 2.5,
  usersGrowth: 12.3,
  activeUsersGrowth: 8.7,
  flaggedGrowth: -15.2,
};

export const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: "a1", type: "user_joined", title: "New user joined",
    description: "Ethan Lee created an account and started playing Chess Champion",
    timestamp: "2024-11-19T10:24:00Z",
    meta: { userId: "u9", userName: "Ethan Lee" },
  },
  {
    id: "a2", type: "user_flagged", title: "User flagged for cheating",
    description: "Noah Kim was flagged in Galaxy Wars for abnormal score progression",
    timestamp: "2024-11-19T09:11:00Z",
    meta: { userId: "u5", userName: "Noah Kim", gameId: "g2", gameName: "Galaxy Wars" },
  },
  {
    id: "a3", type: "game_updated", title: "Game updated",
    description: "Soccer Stars received a new content patch with 5 additional levels",
    timestamp: "2024-11-18T16:45:00Z",
    meta: { gameId: "g6", gameName: "Soccer Stars" },
  },
  {
    id: "a4", type: "user_suspended", title: "User suspended",
    description: "Oliver Brown was suspended following abuse reports across multiple games",
    timestamp: "2024-11-18T14:30:00Z",
    meta: { userId: "u7", userName: "Oliver Brown" },
  },
  {
    id: "a5", type: "game_added", title: "New game added",
    description: "Tank Battle was added to the platform in draft status",
    timestamp: "2024-11-17T11:00:00Z",
    meta: { gameId: "g14", gameName: "Tank Battle" },
  },
  {
    id: "a6", type: "user_joined", title: "New user joined",
    description: "Charlotte Harris joined and completed her first puzzle",
    timestamp: "2024-11-16T08:55:00Z",
    meta: { userId: "u12", userName: "Charlotte Harris" },
  },
];
