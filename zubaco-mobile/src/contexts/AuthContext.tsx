import React, { createContext, useContext, useEffect, useState } from 'react';
import { SecureStorage } from '../services/secureStorage';
import { api } from '../services/api';
import { analyticsService } from '../services/analytics';
import { track, AnalyticsEvent } from '../services/analyticsEvents';
import { setUser as setCrashUser } from '../services/crashReporting';
import { pushNotifications } from '../services/pushNotifications';

interface User {
  id: string;
  username?: string;
  display_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  xp: number;
  level: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokens: { accessToken: string; refreshToken: string }, user: User) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithApple: (identityToken: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Attach observability identity + register the push token once a user is known.
  async function onAuthenticated(u: User, method: string) {
    setUser(u);
    try {
      await analyticsService.setUserId(u.id);
      setCrashUser(u.id, u.email);
      await track.login(method);
      // Fire-and-forget: backend push-token registration (auth required).
      pushNotifications.registerToken().catch(() => {});
    } catch {
      // Observability must never block the auth flow.
    }
  }

  useEffect(() => {
    // Global unauthorized handling: when a refresh fails, the api client calls
    // this to tear the session down so the navigator returns to Login.
    api.setOnSessionExpired(() => {
      SecureStorage.clearTokens().catch(() => {});
      api.setToken(null);
      pushNotifications.clear();
      setUser(null);
    });
    track.event(AnalyticsEvent.APP_OPEN).catch(() => {});
    loadStoredAuth();
    return () => api.setOnSessionExpired(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Silent login / session restore from securely-stored tokens.
  async function loadStoredAuth() {
    try {
      const token = await SecureStorage.getAccessToken();
      if (token) {
        api.setToken(token);
        const profile = await api.getProfile();
        const restored: User = {
          id: profile.id,
          username: profile.username ?? undefined,
          display_name: profile.display_name ?? undefined,
          email: profile.email ?? undefined,
          phone: profile.phone ?? undefined,
          avatar_url: profile.avatar_url ?? undefined,
          xp: profile.xp,
          level: profile.level,
        };
        setUser(restored);
        analyticsService.setUserId(restored.id).catch(() => {});
        setCrashUser(restored.id, restored.email);
        pushNotifications.registerToken().catch(() => {});
      }
    } catch {
      await SecureStorage.clearTokens();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(tokens: { accessToken: string; refreshToken: string }, userData: User) {
    await SecureStorage.setTokens(tokens.accessToken, tokens.refreshToken);
    api.setToken(tokens.accessToken);
    await onAuthenticated(userData, 'phone');
  }

  async function loginWithGoogle(idToken: string) {
    const result = await api.googleLogin(idToken);
    await SecureStorage.setTokens(result.accessToken, result.refreshToken);
    api.setToken(result.accessToken);
    await onAuthenticated(result.user as User, 'google');
  }

  async function loginWithApple(identityToken: string, name?: string) {
    const result = await api.appleLogin(identityToken, name);
    await SecureStorage.setTokens(result.accessToken, result.refreshToken);
    api.setToken(result.accessToken);
    await onAuthenticated(result.user as User, 'apple');
  }

  async function logout() {
    try {
      const refreshToken = await SecureStorage.getRefreshToken();
      if (refreshToken) {
        await api.logout(refreshToken);
      }
    } catch {}
    try {
      await track.logout();
    } catch {}
    pushNotifications.clear();
    setCrashUser('', undefined);
    await SecureStorage.clearTokens();
    api.setToken(null);
    setUser(null);
  }

  async function refreshUser() {
    try {
      const profile = await api.getProfile();
      setUser({
        id: profile.id,
        username: profile.username ?? undefined,
        display_name: profile.display_name ?? undefined,
        email: profile.email ?? undefined,
        phone: profile.phone ?? undefined,
        avatar_url: profile.avatar_url ?? undefined,
        xp: profile.xp,
        level: profile.level,
      });
    } catch {}
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithGoogle,
        loginWithApple,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
