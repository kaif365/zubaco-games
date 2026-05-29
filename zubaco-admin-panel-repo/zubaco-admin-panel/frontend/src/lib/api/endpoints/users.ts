import type { User } from "@/types/user";
import type {
  PaginatedResponse,
  FilterParams,
  PaginationParams,
} from "@/types/common";
import { get, post } from "@/lib/api/http";

interface UsersApiResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

export async function fetchUsers(
  params: PaginationParams & FilterParams,
): Promise<PaginatedResponse<User>> {
  const res = await get<UsersApiResponse>("/admin/users", {
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

  return {
    data: res.users,
    total: res.total,
    page: res.page,
    pageSize: params.pageSize,
    totalPages: res.totalPages,
  };
}

export async function fetchUserById(id: string): Promise<User | null> {
  return get<User>(`/admin/users/${id}`);
}

export async function banUser(id: string): Promise<unknown> {
  return post(`/admin/users/${id}/ban`);
}

export async function unbanUser(id: string): Promise<unknown> {
  return post(`/admin/users/${id}/unban`);
}
