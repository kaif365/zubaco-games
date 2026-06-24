import type { FlaggedUser, FlagStatus } from "@/types/flagged";
import type {
  PaginatedResponse,
  FilterParams,
  PaginationParams,
} from "@/types/common";
import { get, post } from "@/lib/api/http";

// Flag type mapping (backend uses integers)
const FLAG_TYPE_NAMES: Record<number, string> = {
  0: "Score Anomaly",
  1: "Timing Anomaly",
  2: "Impossible Score",
  3: "Rapid Progression",
  4: "Device Duplicate",
  5: "Input Bot Pattern",
  6: "Session Tampering",
};

const FLAG_SEVERITY_MAP: Record<number, FlaggedUser["severity"]> = {
  0: "low",
  1: "medium",
  2: "high",
  3: "critical",
};

const FLAG_REASON_MAP: Record<number, FlaggedUser["reason"]> = {
  0: "cheating",
  1: "cheating",
  2: "exploit",
  3: "spam",
  4: "multiple_accounts",
  5: "cheating",
  6: "exploit",
};

interface BackendCheatFlag {
  id: string;
  reference_id: string;
  user_id: string;
  flag_type: number;
  game_type: number;
  game_id: string;
  game_created_at: string;
  received_at: string;
}

interface BackendListResponse {
  items: BackendCheatFlag[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function mapToFlaggedUser(flag: BackendCheatFlag): FlaggedUser {
  return {
    id: flag.id,
    userId: flag.user_id,
    userName: flag.user_id.slice(0, 8), // Will be enriched by join later
    userEmail: "",
    gameId: flag.game_id,
    gameName: FLAG_TYPE_NAMES[flag.flag_type] || `Type ${flag.flag_type}`,
    reason: FLAG_REASON_MAP[flag.flag_type] || "cheating",
    severity: FLAG_SEVERITY_MAP[Math.min(flag.flag_type, 3)] || "medium",
    date: flag.game_created_at || flag.received_at,
    status: "pending",
  };
}

export async function fetchFlaggedUsers(
  params: PaginationParams & FilterParams,
): Promise<PaginatedResponse<FlaggedUser>> {
  const queryParams = new URLSearchParams({
    page: String(params.page),
    limit: String(params.pageSize),
  });

  if (params.search) queryParams.set("userId", params.search);

  const response = await get<BackendListResponse>(
    `/admin/cheat-flags?${queryParams.toString()}`,
  );

  if (!response) {
    return { data: [], total: 0, page: params.page, pageSize: params.pageSize, totalPages: 0 };
  }

  const data = response.items.map(mapToFlaggedUser);

  return {
    data,
    total: response.pagination.total,
    page: response.pagination.page,
    pageSize: params.pageSize,
    totalPages: response.pagination.totalPages,
  };
}

export async function updateFlaggedStatus(
  id: string,
  status: FlagStatus,
): Promise<FlaggedUser> {
  // Map frontend status to backend action
  const actionMap: Record<string, string> = {
    safe: "dismiss",
    suspended: "ban",
    reviewed: "warn",
  };
  const action = actionMap[status] || "dismiss";
  const endpoint = `/admin/cheat-flags/${id}/${action}`;

  const result = await post<any>(endpoint, { admin_id: "current" });
  // Return a mapped result
  return {
    id,
    userId: result?.user_id || "",
    userName: "",
    userEmail: "",
    gameId: "",
    gameName: "",
    reason: "cheating",
    severity: "medium",
    date: new Date().toISOString(),
    status,
  };
}

export async function fetchFlaggedById(
  id: string,
): Promise<FlaggedUser | null> {
  // Individual flag fetch not supported by current backend — return null
  return null;
}

// ─── NEW: Anti-cheat action APIs ─────────────────────────────────

export async function dismissFlag(flagId: string, adminId: string) {
  return post(`/admin/cheat-flags/${flagId}/dismiss`, { admin_id: adminId });
}

export async function warnFlag(flagId: string, adminId: string) {
  return post(`/admin/cheat-flags/${flagId}/warn`, { admin_id: adminId });
}

export async function banFlag(flagId: string, adminId: string) {
  return post(`/admin/cheat-flags/${flagId}/ban`, { admin_id: adminId });
}

export async function unbanUser(userId: string) {
  return post(`/admin/cheat-flags/users/${userId}/unban`, {});
}

export async function resetUserRiskScore(userId: string) {
  return post(`/admin/cheat-flags/users/${userId}/reset-risk`, {});
}

export async function getUserRiskScore(userId: string): Promise<{ user_id: string; risk_score: number; penalty_tier: number } | null> {
  return get(`/admin/cheat-flags/users/${userId}/risk-score`);
}
