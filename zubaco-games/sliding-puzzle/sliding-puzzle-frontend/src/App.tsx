import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppProviders } from '@app/providers/AppProviders';
import { AppRouter } from '@app/router/AppRouter';
import mandalaImage from '@micro-screens/assets/mandala-vector.png';

import { disableCopyAndSelection, disableDevTools } from './utils/security';

export default function App() {
  const { t } = useTranslation();
  const [isCompactLandscape, setIsCompactLandscape] = useState(false);
  useEffect(() => {
    const cleanupDevTools = disableDevTools();
    const cleanupCopy = disableCopyAndSelection();

    return () => {
      cleanupDevTools();
      cleanupCopy();
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(orientation: landscape) and (max-height: 610px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsCompactLandscape(event.matches);
    };

    setIsCompactLandscape(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);
  return (
    <AppProviders>
      {isCompactLandscape ? (
        <div className="w-full h-[100vh] overflow-hidden flex flex-col items-center justify-center px-4 text-center backdrop-blur">
          <div
            className="pointer-events-none absolute inset-0 scale-150 bg-contain bg-center bg-no-repeat opacity-20 h-full md:h-[80vh] top-1/2 -translate-y-1/2"
            style={{ backgroundImage: `url('${mandalaImage}')` }}
          />
          <div className="phone" />
          <div className="message">
            <p className="text-lg tracking-[0.14em] gradient-text uppercase font-bold">
              {t('tilt.title')}
            </p>
            <p className="max-w-[340px] mx-auto text-center text-[14px] tracking-[0.13em] text-white/80">
              {t('tilt.message')}
            </p>
          </div>
        </div>
      ) : (
        <AppRouter />
      )}
    </AppProviders>
  );
}
