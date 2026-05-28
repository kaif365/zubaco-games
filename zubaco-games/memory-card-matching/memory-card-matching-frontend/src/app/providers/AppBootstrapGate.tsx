import type { ReactNode } from 'react';
import { useMemo } from 'react';

import { AuthGateScreen } from '@/components/shared/AuthGateScreen';
import { buildGameThemeStyle } from '@/utils/gameThemeStyle';
import { useAuthGate } from '@/hooks/useAuthGate';

interface AppBootstrapGateProps {
  children: ReactNode;
}

export function AppBootstrapGate({ children }: AppBootstrapGateProps) {
  const { isReady, error, phase } = useAuthGate();
  const gameThemeStyle = useMemo(() => buildGameThemeStyle(), []);

  if (!isReady || error) {
    return <AuthGateScreen gameThemeStyle={gameThemeStyle} error={error} phase={phase} />;
  }

  return children;
}
