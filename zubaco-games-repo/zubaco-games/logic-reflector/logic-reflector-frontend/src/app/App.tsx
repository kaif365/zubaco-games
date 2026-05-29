import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppProviders } from '@/app/providers/AppProviders';
import { AppRouter } from '@/app/router/AppRouter';
import { I18nProvider } from '@/lib/i18n';

function TiltScreen() {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-4xl">↩️</div>
      <p className="text-lg font-bold tracking-widest uppercase text-primary">
        {t('tilt.title')}
      </p>
      <p className="text-sm text-muted-foreground max-w-xs">
        {t('tilt.message')}
      </p>
    </div>
  );
}

export function App() {
  const [isCompactLandscape, setIsCompactLandscape] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape) and (max-height: 610px)');
    const handle = (e: MediaQueryListEvent) => { setIsCompactLandscape(e.matches); };
    setIsCompactLandscape(mq.matches);
    mq.addEventListener('change', handle);
    return () => { mq.removeEventListener('change', handle); };
  }, []);

  return (
    <I18nProvider>
      <AppProviders>
        {isCompactLandscape ? (
          <TiltScreen />
        ) : (
          <AppRouter />
        )}
      </AppProviders>
    </I18nProvider>
  );
}
