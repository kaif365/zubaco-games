import type { AuthUser } from "@/types/auth";
import { login, logout } from "@/lib/api/endpoints/auth";

export function pickAuthUser(
  payload: unknown,
  fallbackEmail: string,
): AuthUser {
  const fallback: AuthUser = { email: fallbackEmail, name: "Admin" };
  if (!payload || typeof payload !== "object") return fallback;

  const root = payload as Record<string, unknown>;
  const data = (root.data && typeof root.data === "object" ? root.data : root) as Record<string, unknown>;

  const userObj =
    (data.admin && typeof data.admin === "object" ? (data.admin as Record<string, unknown>) : null) ||
    (data.user && typeof data.user === "object" ? (data.user as Record<string, unknown>) : null) ||
    (root.admin && typeof root.admin === "object" ? (root.admin as Record<string, unknown>) : null) ||
    (root.user && typeof root.user === "object" ? (root.user as Record<string, unknown>) : null) ||
    (typeof data.email === "string" ? data : null) ||
    (typeof root.email === "string" ? root : null);

  if (!userObj) return fallback;

  const email =
    typeof userObj.email === "string" ? userObj.email : fallbackEmail;
  const name =
    typeof userObj.name === "string"
      ? userObj.name
      : (typeof userObj.display_name === "string" ? userObj.display_name : "Admin");
  return { email, name };
}

export function pickAuthToken(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;

  const direct =
    (typeof root.token === "string" && root.token) ||
    (typeof root.accessToken === "string" && root.accessToken) ||
    (typeof root.access_token === "string" && root.access_token);
  if (direct) return direct;

  const data = root.data;
  if (data && typeof data === "object") {
    const dataObj = data as Record<string, unknown>;
    const nested =
      (typeof dataObj.token === "string" && dataObj.token) ||
      (typeof dataObj.accessToken === "string" && dataObj.accessToken) ||
      (typeof dataObj.access_token === "string" && dataObj.access_token);
    if (nested) return nested;
  }

  return null;
}

export const authService = {
  login,
  logout,
};
