import React, { createContext, useContext, useEffect, useState } from 'react';
import { SecureStorage } from '../services/secureStorage';
import { api } from '../services/api';

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
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const token = await SecureStorage.getAccessToken();
      if (token) {
        api.setToken(token);
        const profile = await api.getProfile();
        setUser(profile);
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
    setUser(userData);
  }

  async function logout() {
    try {
      const refreshToken = await SecureStorage.getRefreshToken();
      if (refreshToken) {
        await api.logout(refreshToken);
      }
    } catch {}
    await SecureStorage.clearTokens();
    api.setToken(null);
    setUser(null);
  }

  async function refreshUser() {
    try {
      const profile = await api.getProfile();
      setUser(profile);
    } catch {}
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
