import type { ReactNode } from 'react';
import { useMemo } from 'react';

import { AuthGateScreen } from '@/components/shared/AuthGateScreen';
import { buildGameThemeStyle } from '@/utils/gameThemeStyle';
import { appConfig } from '@app/config/appConfig';
import { useAuthGate } from '@hooks/useAuthGate';

import { QueryProvider } from './QueryProvider';
import { ToastProvider } from './ToastProvider';

interface AppBootstrapGateProps {
  children: ReactNode;
}

export function AppBootstrapGate({ children }: AppBootstrapGateProps) {
  const { isReady, error, phase } = useAuthGate();
  const gameThemeStyle = useMemo(
    () => buildGameThemeStyle(appConfig.socket.stageNumber),
    [],
  );

  if (!isReady || error) {
    return <AuthGateScreen gameThemeStyle={gameThemeStyle} error={error} phase={phase} />;
  }

  return (
    <QueryProvider>
      <ToastProvider>{children}</ToastProvider>
    </QueryProvider>
  );
}
