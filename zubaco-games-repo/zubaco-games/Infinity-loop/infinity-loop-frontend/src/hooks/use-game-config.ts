"use client";

import {
  DEFAULT_GAME_CONFIG,
  mergeGameConfigWithDefaults,
} from "@/config/game-config";
import {
  GAME_PLAY_SURFACE,
  type GamePlaySurface,
} from "@/constants/game-play-surface";
import { QUERY_ROOT } from "@/constants/react-query-keys";
import { useUser } from "@/context/user-context";
import { hydrateSessionTokenFromStorage, readSessionToken } from "@/lib/auth";
import { normalizeLang } from "@/lib/i18n/lang-cookie";
import authService from "@/services/api/auth";
import configServices from "@/services/api/config";
import gameServices from "@/services/api/game";
import useGameStore from "@/store/game";
import type { UserDemoResponse } from "@/types/user-demo";
import { useQuery } from "@tanstack/react-query";
import { useLayoutEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";

export interface UseGameConfigOptions {
  readonly surface: GamePlaySurface;
  readonly stageId: string;
  readonly enableUserDemoFetch?: boolean;
}

async function fetchUserDemoWithDevSessionFallback(
  stageId: string,
  syncTokenFromStorage: () => Promise<void>,
): Promise<UserDemoResponse> {
  await hydrateSessionTokenFromStorage();
  let sessionToken = readSessionToken();
  if (!sessionToken) {
    await authService.ensureUserSession(stageId);
    await hydrateSessionTokenFromStorage();
    await syncTokenFromStorage();
    sessionToken = readSessionToken();
  }
  if (!sessionToken) {
    throw new Error("Session unavailable");
  }
  return gameServices.getUserDemo();
}

export const useGameConfig = ({
  surface,
  stageId,
  enableUserDemoFetch = true,
}: UseGameConfigOptions) => {
  const { i18n } = useTranslation();
  const appLang = normalizeLang(i18n.language);
  const { token, isTokenReady, syncTokenFromStorage } = useUser();
  const fetchUserDemo =
    surface === GAME_PLAY_SURFACE.TUTORIAL && enableUserDemoFetch;
  const shouldFetchUserDemo = fetchUserDemo && isTokenReady && Boolean(stageId);

  const {
    data: demoResponse,
    isLoading: demoLoading,
    error: demoError,
    isFetching: demoFetching,
  } = useQuery({
    queryKey: [QUERY_ROOT.USER_DEMO, stageId],
    queryFn: () =>
      fetchUserDemoWithDevSessionFallback(stageId, syncTokenFromStorage),
    staleTime: Infinity,
    enabled: shouldFetchUserDemo,
  });

  const demoData = demoResponse?.data;

  const {
    data: remoteConfig,
    isLoading: configLoading,
    error: configError,
    isFetching: configFetching,
  } = useQuery({
    queryKey: [QUERY_ROOT.GAME_CONFIG, stageId, appLang],
    queryFn: () => configServices.getGameConfig(stageId, appLang),
    enabled: Boolean(stageId) && isTokenReady && Boolean(token),
    staleTime: Infinity,
  });

  const setInstructionOverride = useGameStore((s) => s.setInstructionOverride);
  const clearInstructionOverride = useGameStore(
    (s) => s.clearInstructionOverride,
  );

  useLayoutEffect(() => {
    clearInstructionOverride();
  }, [stageId, clearInstructionOverride]);

  useLayoutEffect(() => {
    if (configError) {
      clearInstructionOverride();
    }
  }, [configError, clearInstructionOverride]);

  useLayoutEffect(() => {
    if (!remoteConfig) return;
    setInstructionOverride(remoteConfig.instructionOverride);
  }, [remoteConfig, setInstructionOverride]);

  const config = useMemo(() => {
    const remoteGameConfig = remoteConfig?.gameConfig;
    const raw = remoteGameConfig ?? DEFAULT_GAME_CONFIG;
    return mergeGameConfigWithDefaults(raw);
  }, [remoteConfig]);

  const isRemoteConfigLoading =
    !isTokenReady ||
    (shouldFetchUserDemo && (demoLoading || demoFetching)) ||
    (Boolean(stageId) &&
      isTokenReady &&
      Boolean(token) &&
      (configLoading || configFetching));

  /** Token bootstrap, optional user demo (instructions), then CMS config once a bearer exists. */
  const isInstructionsContentLoading = isRemoteConfigLoading;

  const error = demoError ?? configError;

  const { enableDemo, isPlayEnabled } = useMemo(() => {
    if (surface === GAME_PLAY_SURFACE.LIVE) {
      return { enableDemo: false, isPlayEnabled: true };
    }
    if (!fetchUserDemo) {
      return { enableDemo: true, isPlayEnabled: true };
    }
    if (!shouldFetchUserDemo) {
      return { enableDemo: true, isPlayEnabled: true };
    }
    if (demoError) {
      return { enableDemo: false, isPlayEnabled: false };
    }
    if (!demoData) {
      return { enableDemo: true, isPlayEnabled: true };
    }
    return {
      enableDemo: demoData.enableDemo,
      isPlayEnabled: demoData.isEnabled,
    };
  }, [demoData, demoError, fetchUserDemo, shouldFetchUserDemo, surface]);

  return {
    config,
    isLoading: isRemoteConfigLoading,
    isInstructionsContentLoading,
    error,
    enableDemo,
    isPlayEnabled,
  };
};
