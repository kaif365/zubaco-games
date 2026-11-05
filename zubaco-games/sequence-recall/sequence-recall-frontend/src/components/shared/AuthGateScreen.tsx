import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import type { AuthGateLoadingPhase } from '@hooks/useAuthGate';

interface AuthGateScreenProps {
  gameThemeStyle: CSSProperties;
  error: string | null;
  phase?: AuthGateLoadingPhase;
  /** Spinner only — no card or status copy (e.g. session restore). */
  loaderOnly?: boolean;
}

export function AuthGateScreen({
  gameThemeStyle,
  error,
  phase: _phase = 'dev-session',
  loaderOnly = true,
}: AuthGateScreenProps) {
  const { t } = useTranslation();

  return (
    <main
      className={`sequence-recall-shell auth-gate-screen select-none${!error || loaderOnly ? ' auth-gate-screen--loader-only' : ''}`}
      style={gameThemeStyle}
    >
      {error ? (
        <div className="auth-gate-card">
          <p className="auth-gate-title">{t('auth.failedTitle')}</p>
          <p className="auth-gate-copy">{error}</p>
        </div>
      ) : (
        <div className="auth-gate-spinner" aria-hidden />
      )}
    </main>
  );
}
