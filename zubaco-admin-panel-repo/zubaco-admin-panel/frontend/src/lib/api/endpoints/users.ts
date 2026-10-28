import type { User } from "@/types/user";
import type {
  PaginatedResponse,
  FilterParams,
  PaginationParams,
} from "@/types/common";
import { get, post } from "@/lib/api/http";

interface BackendUser {
  id: string;
  username?: string | null;
  display_name?: string | null;
  email?: string | null;
  phone?: string | null;
  xp?: number;
  level?: number;
  is_banned?: boolean;
  is_verified?: boolean;
  created_at?: string;
  last_login_at?: string | null;
}

function mapBackendUser(u: BackendUser): User {
  return {
    id: u.id,
    name: u.display_name || u.username || u.email || "User",
    email: u.email || u.phone || "—",
    avatar: "",
    gamesPlayed: u.level || 0,
    status: u.is_banned ? "suspended" : "active",
    joinDate: u.created_at || new Date().toISOString(),
    lastActive: u.last_login_at || u.created_at || new Date().toISOString(),
  };
}

export async function fetchUsers(
  params: PaginationParams & FilterParams,
): Promise<PaginatedResponse<User>> {
  const res = await get<any>("/admin/users", {
    query: {
      search: params.search || undefined,
      page: params.page,
      limit: params.pageSize,
      status: params.status || undefined,
    },
  });

  if (!res) {
    return { data: [], total: 0, page: 1, pageSize: params.pageSize, totalPages: 0 };
  }

  const payload = res?.data ?? res;
  const rawUsers: BackendUser[] = Array.isArray(payload?.users)
    ? payload.users
    : Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload)
        ? payload
        : [];

  const total = payload?.total ?? rawUsers.length;
  const page = payload?.page ?? params.page;
  const totalPages =
    payload?.total_pages ??
    payload?.totalPages ??
    Math.max(1, Math.ceil(total / params.pageSize));

  return {
    data: rawUsers.map(mapBackendUser),
    total,
    page,
    pageSize: params.pageSize,
    totalPages,
  };
}

export async function fetchUserById(id: string): Promise<User | null> {
  const res = await get<any>(`/admin/users/${id}`);
  if (!res) return null;
  const payload = res?.data ?? res;
  return mapBackendUser(payload);
}

export async function banUser(id: string): Promise<unknown> {
  return post(`/admin/users/${id}/ban`);
}

export async function unbanUser(id: string): Promise<unknown> {
  return post(`/admin/users/${id}/unban`);
}
