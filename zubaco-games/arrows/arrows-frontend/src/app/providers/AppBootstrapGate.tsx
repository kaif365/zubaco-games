import type { ReactNode } from 'react';
import { appEnv } from '@/app/config/env';

interface AppBootstrapGateProps {
  children: ReactNode;
}

/**
 * Auth gate — blocks rendering until auth is verified.
 * When VITE_USER_STAGE_ID is empty, bypasses auth for local dev.
 */
export function AppBootstrapGate({ children }: AppBootstrapGateProps) {
  const skipAuth = !appEnv.userStageId;

  if (skipAuth) {
    // Dev mode: no backend, render app directly
    return <>{children}</>;
  }

  // TODO: In production, verify auth session before rendering.
  // For now, just render children since backend integration is pending.
  return <>{children}</>;
}
