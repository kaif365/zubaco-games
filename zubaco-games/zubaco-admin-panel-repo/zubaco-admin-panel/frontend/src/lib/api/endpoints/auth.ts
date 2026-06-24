import { get, post } from "@/lib/api/http";

export async function login(email: string, password: string): Promise<unknown> {
  // We return the raw payload as the hook uses pickAuthToken/pickAuthUser on it
  return post<unknown>("/admin/auth/login", { email, password });
}

export async function logout(token?: string): Promise<void> {
  try {
    await post("/admin/auth/logout", undefined, {
      token,
      keepalive: true,
    });
  } catch {
    // ignore
  }
}

export async function getSelf(): Promise<unknown> {
  return get<unknown>("/admin/auth/me");
}
