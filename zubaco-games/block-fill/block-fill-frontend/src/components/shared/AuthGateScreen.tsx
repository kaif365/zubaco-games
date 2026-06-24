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
}: AuthGateScreenProps) {
  const { t } = useTranslation();

  // Only show UI when there's an actual error; otherwise render an empty dark screen
  // so users don't see a "buffering" spinner/text on startup.
  return (
    <main
      className="block-fill-shell auth-gate-screen select-none"
      style={gameThemeStyle}
    >
      {error ? (
        <div className="auth-gate-card">
          <p className="auth-gate-title">{t('auth.failedTitle')}</p>
          <p className="auth-gate-copy">{error}</p>
        </div>
      ) : null}
    </main>
  );
}
