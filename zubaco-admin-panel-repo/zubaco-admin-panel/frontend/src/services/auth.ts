import type { AuthUser } from "@/types/auth";
import { login, logout } from "@/lib/api/endpoints/auth";

export function pickAuthUser(
  payload: unknown,
  fallbackEmail: string,
): AuthUser {
  const fallback: AuthUser = { email: fallbackEmail, name: "Admin" };
  if (!payload || typeof payload !== "object") return fallback;

  const root = payload as Record<string, unknown>;
  const candidate = (
    root.user && typeof root.user === "object" ? root.user : null
  ) as Record<string, unknown> | null;

  const data = root.data;
  const dataUser =
    data && typeof data === "object" && (data as Record<string, unknown>).user
      ? (data as Record<string, unknown>).user
      : null;

  const maybeUser =
    candidate ||
    (dataUser && typeof dataUser === "object"
      ? (dataUser as Record<string, unknown>)
      : null);

  if (!maybeUser) return fallback;

  const email =
    typeof maybeUser.email === "string" ? maybeUser.email : fallbackEmail;
  const name = typeof maybeUser.name === "string" ? maybeUser.name : "Admin";
  return { email, name };
}

export function pickAuthToken(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;

  const direct =
    (typeof root.token === "string" && root.token) ||
    (typeof root.accessToken === "string" && root.accessToken);
  if (direct) return direct;

  const data = root.data;
  if (data && typeof data === "object") {
    const dataObj = data as Record<string, unknown>;
    const nested =
      (typeof dataObj.token === "string" && dataObj.token) ||
      (typeof dataObj.accessToken === "string" && dataObj.accessToken);
    if (nested) return nested;
  }

  return null;
}

export const authService = {
  login,
  logout,
};
