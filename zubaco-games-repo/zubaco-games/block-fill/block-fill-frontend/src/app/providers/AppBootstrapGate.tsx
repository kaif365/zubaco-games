import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';

import { AuthGateScreen } from '@/components/shared/AuthGateScreen';
import { useAuthGate } from '@/hooks/useAuthGate';
import { applyDocumentStageTheme } from '@/utils/applyDocumentStageTheme';
import { buildGameThemeStyle } from '@/utils/gameThemeStyle';
import { resolveUserStageNumber } from '@/utils/resolveUserStageNumber';
import { appEnv } from '@/app/config/env';

interface AppBootstrapGateProps {
  children: ReactNode;
}

export function AppBootstrapGate({ children }: AppBootstrapGateProps) {
  const skipAuth = !appEnv.userStageId;
  const { isReady, error, phase } = useAuthGate();
  const stageNumber = resolveUserStageNumber();
  const gameThemeStyle = useMemo(() => buildGameThemeStyle(stageNumber), [stageNumber]);

  useEffect(() => {
    applyDocumentStageTheme(stageNumber);
  }, [stageNumber]);

  // Skip auth gate when no backend stage is configured (local dev without backend)
  if (skipAuth) {
    return children;
  }

  if (!isReady || error) {
    return <AuthGateScreen gameThemeStyle={gameThemeStyle} error={error} phase={phase} />;
  }

  return children;
}
