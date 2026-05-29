export type FlagSeverity = "low" | "medium" | "high" | "critical";
export type FlagStatus = "pending" | "reviewed" | "safe" | "suspended";
export type FlagReason =
  | "cheating"
  | "abuse"
  | "spam"
  | "exploit"
  | "inappropriate_content"
  | "multiple_accounts";

export interface FlaggedUser {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  gameId: string;
  gameName: string;
  reason: FlagReason;
  severity: FlagSeverity;
  date: string;
  status: FlagStatus;
  notes?: string;
  reportedBy?: string;
}
