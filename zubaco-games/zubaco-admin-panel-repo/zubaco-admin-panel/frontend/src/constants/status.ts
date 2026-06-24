import type { GameStatus } from "@/types/game";
import type { UserStatus } from "@/types/user";
import type { FlagSeverity, FlagStatus, FlagReason } from "@/types/flagged";

export const GAME_STATUS_CONFIG: Record<
  GameStatus,
  { label: string; variant: "success" | "secondary" | "outline" }
> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "secondary" },
  draft: { label: "Draft", variant: "outline" },
};

export const USER_STATUS_CONFIG: Record<
  UserStatus,
  { label: string; variant: "success" | "secondary" | "destructive" | "warning" }
> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "secondary" },
  suspended: { label: "Suspended", variant: "destructive" },
  flagged: { label: "Flagged", variant: "warning" },
};

export const FLAG_SEVERITY_CONFIG: Record<
  FlagSeverity,
  { label: string; variant: "outline" | "warning" | "destructive" | "critical" }
> = {
  low: { label: "Low", variant: "outline" },
  medium: { label: "Medium", variant: "warning" },
  high: { label: "High", variant: "destructive" },
  critical: { label: "Critical", variant: "critical" },
};

export const FLAG_STATUS_CONFIG: Record<
  FlagStatus,
  { label: string; variant: "warning" | "secondary" | "success" | "destructive" }
> = {
  pending: { label: "Pending", variant: "warning" },
  reviewed: { label: "Reviewed", variant: "secondary" },
  safe: { label: "Safe", variant: "success" },
  suspended: { label: "Suspended", variant: "destructive" },
};

export const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  cheating: "Cheating",
  abuse: "Abuse",
  spam: "Spam",
  exploit: "Exploit",
  inappropriate_content: "Inappropriate Content",
  multiple_accounts: "Multiple Accounts",
};

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 10;
