"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { UserContextValue } from "@/context/types";
import {
  hydrateSessionTokenFromStorage,
  readSessionToken,
  registerUnauthorizedRecovery,
} from "@/lib/auth";
import {
  invalidateUserDemoQueries,
  removeSessionScopedQueries,
} from "@/lib/query/session-query-cache";
import authService from "@/services/api/auth";
import { getEnvStageId } from "@/utils/get-env-stage-id";

import type * as React from "react";

export const UserContext = createContext<UserContextValue | undefined>(
  undefined,
);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [isTokenReady, setIsTokenReady] = useState(false);

  const { mutateAsync: bootstrapAsync } = useMutation({
    mutationFn: (stageId: string) => authService.bootstrapUserSession(stageId),
  });

  const { mutateAsync: resetSessionAsync } = useMutation({
    mutationFn: (stageId: string) => authService.resetUserSession(stageId),
  });

  const bootstrapAsyncRef = useRef(bootstrapAsync);
  const resetSessionAsyncRef = useRef(resetSessionAsync);
  useEffect(() => {
    bootstrapAsyncRef.current = bootstrapAsync;
    resetSessionAsyncRef.current = resetSessionAsync;
  }, [bootstrapAsync, resetSessionAsync]);

  const bootstrapAuth = useCallback(
    async (stageId: string) => {
      try {
        const sessionToken = await bootstrapAsyncRef.current(stageId);
        startTransition(() => {
          setToken(sessionToken);
          setIsTokenReady(true);
        });
        invalidateUserDemoQueries(queryClient);
      } catch {
        startTransition(() => {
          setToken(null);
          setIsTokenReady(true);
        });
        removeSessionScopedQueries(queryClient);
      }
    },
    [queryClient],
  );

  const rebootstrapAuth = useCallback(async (): Promise<void> => {
    const stageId = getEnvStageId();
    if (!stageId) {
      startTransition(() => {
        setToken(null);
        setIsTokenReady(true);
      });
      removeSessionScopedQueries(queryClient);
      return;
    }
    try {
      const sessionToken = await resetSessionAsyncRef.current(stageId);
      startTransition(() => {
        setToken(sessionToken);
        setIsTokenReady(true);
      });
      invalidateUserDemoQueries(queryClient);
    } catch {
      startTransition(() => {
        setToken(null);
        setIsTokenReady(true);
      });
      removeSessionScopedQueries(queryClient);
    }
  }, [queryClient]);

  useEffect(() => {
    const stageId = getEnvStageId();
    if (stageId) {
      void bootstrapAuth(stageId);
    } else {
      startTransition(() => {
        setToken(null);
        setIsTokenReady(true);
      });
      removeSessionScopedQueries(queryClient);
    }
  }, [bootstrapAuth, queryClient]);

  useEffect(() => {
    registerUnauthorizedRecovery(rebootstrapAuth);
    return () => registerUnauthorizedRecovery(null);
  }, [rebootstrapAuth]);

  const syncTokenFromStorage = useCallback(async (): Promise<void> => {
    await hydrateSessionTokenFromStorage();
    const next = readSessionToken();
    startTransition(() => {
      setToken(next);
      setIsTokenReady(true);
    });
    if (next === null) {
      removeSessionScopedQueries(queryClient);
    }
  }, [queryClient]);

  const value = useMemo<UserContextValue>(
    () => ({
      token,
      isTokenReady,
      syncTokenFromStorage,
      rebootstrapAuth,
    }),
    [isTokenReady, rebootstrapAuth, syncTokenFromStorage, token],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
