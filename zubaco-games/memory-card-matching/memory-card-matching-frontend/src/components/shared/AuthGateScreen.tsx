import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import type { AuthGateLoadingPhase } from '@/hooks/useAuthGate';

interface AuthGateScreenProps {
  gameThemeStyle: CSSProperties;
  error: string | null;
  phase?: AuthGateLoadingPhase;
  loaderOnly?: boolean;
}

const PHASE_COPY_KEYS: Record<
  AuthGateLoadingPhase,
  {
    title: 'auth.fetchingDevUserTitle' | 'auth.fetchingConfigTitle';
    copy: 'auth.fetchingDevUserCopy' | 'auth.fetchingConfigCopy';
  }
> = {
  'dev-session': {
    title: 'auth.fetchingDevUserTitle',
    copy: 'auth.fetchingDevUserCopy',
  },
  config: {
    title: 'auth.fetchingConfigTitle',
    copy: 'auth.fetchingConfigCopy',
  },
};

export function AuthGateScreen({
  gameThemeStyle,
  error,
  phase = 'dev-session',
  loaderOnly = false,
}: AuthGateScreenProps) {
  const { t } = useTranslation();
  const copyKeys = PHASE_COPY_KEYS[phase];

  return (
    <main
      className={`memory-match-shell auth-gate-screen select-none${loaderOnly ? ' auth-gate-screen--loader-only' : ''}`}
      style={gameThemeStyle}
    >
      <div className="background-layer" aria-hidden />
      {error ? (
        <div className="auth-gate-card">
          <p className="auth-gate-title">{t('auth.failedTitle')}</p>
          <p className="auth-gate-copy">{error}</p>
        </div>
      ) : loaderOnly ? (
        <div className="auth-gate-spinner" aria-hidden />
      ) : (
        <div className="auth-gate-card">
          <div className="auth-gate-spinner" aria-hidden />
          <p className="auth-gate-title">{t(copyKeys.title)}</p>
          <p className="auth-gate-copy">{t(copyKeys.copy)}</p>
        </div>
      )}
    </main>
  );
}
