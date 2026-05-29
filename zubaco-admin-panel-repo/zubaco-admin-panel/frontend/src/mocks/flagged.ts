import type { FlaggedUser } from "@/types/flagged";

export const MOCK_FLAGGED: FlaggedUser[] = [
  {
    id: "f1", userId: "u5", userName: "Noah Kim", userEmail: "noah@example.com",
    gameId: "g2", gameName: "Galaxy Wars", reason: "cheating", severity: "high",
    date: "2024-11-15", status: "pending", notes: "Abnormal score progression detected",
    reportedBy: "System Auto-Detect",
  },
  {
    id: "f2", userId: "u11", userName: "James Wilson", userEmail: "james@example.com",
    gameId: "g1", gameName: "Sudoku Master", reason: "exploit", severity: "medium",
    date: "2024-11-12", status: "pending", notes: "Exploited level skip bug",
    reportedBy: "System Auto-Detect",
  },
  {
    id: "f3", userId: "u7", userName: "Oliver Brown", userEmail: "oliver@example.com",
    gameId: "g8", gameName: "Space Invaders", reason: "abuse", severity: "critical",
    date: "2024-10-30", status: "suspended", notes: "Repeated toxic behavior in leaderboard comments",
    reportedBy: "User Report",
  },
  {
    id: "f4", userId: "u14", userName: "Amelia Jackson", userEmail: "amelia@example.com",
    gameId: "g5", gameName: "Brick Breaker", reason: "multiple_accounts", severity: "medium",
    date: "2024-10-05", status: "suspended", notes: "3 accounts linked to same device",
    reportedBy: "Admin Review",
  },
  {
    id: "f5", userId: "u3", userName: "Liam Johnson", userEmail: "liam@example.com",
    gameId: "g7", gameName: "Word Hunt", reason: "spam", severity: "low",
    date: "2024-09-02", status: "safe", notes: "False positive — bulk progress from offline sync",
    reportedBy: "System Auto-Detect",
  },
  {
    id: "f6", userId: "u9", userName: "Ethan Lee", userEmail: "ethan@example.com",
    gameId: "g3", gameName: "Chess Champion", reason: "cheating", severity: "high",
    date: "2024-11-16", status: "pending", notes: "Engine usage suspected",
    reportedBy: "System Auto-Detect",
  },
  {
    id: "f7", userId: "u12", userName: "Charlotte Harris", userEmail: "charlotte@example.com",
    gameId: "g11", gameName: "Treasure Hunt", reason: "inappropriate_content", severity: "medium",
    date: "2024-11-14", status: "reviewed", notes: "Profile picture violation",
    reportedBy: "User Report",
  },
  {
    id: "f8", userId: "u2", userName: "Maya Patel", userEmail: "maya@example.com",
    gameId: "g2", gameName: "Galaxy Wars", reason: "exploit", severity: "low",
    date: "2024-11-10", status: "safe", notes: "Investigated — legitimate play style",
    reportedBy: "Admin Review",
  },
];
