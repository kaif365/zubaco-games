"use client";
import { createContext, useContext } from "react";
import type { AuthContextValue } from "@/types/auth";
import { useUser } from "@/features/auth/hooks/use-user";
import { useLogin } from "@/features/auth/hooks/use-login";
import { useLogout } from "@/features/auth/hooks/use-logout";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useUser();
  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Ignore errors on logout to ensure local cleanup still happens
    }
  };

  // Prevent flash of unauthenticated state while loading user from storage
  if (isLoading) return null;

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
