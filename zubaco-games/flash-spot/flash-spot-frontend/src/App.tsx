import { useEffect } from 'react';

import { AppProviders } from '@app/providers/AppProviders';
import { AppRouter } from '@app/router/AppRouter';
import { ErrorBoundary } from '@app/components/ErrorBoundary';
import { OfflineBanner } from '@app/components/OfflineBanner';

import { buildGameThemeStyle } from './utils/gameThemeStyle';
import { appConfig } from './app/config/appConfig';

export default function App() {
  useEffect(() => {
    const themeStyle = buildGameThemeStyle(appConfig.socket.stageNumber);
    Object.entries(themeStyle).forEach(([property, value]) => {
      if (typeof value === 'string') {
        document.documentElement.style.setProperty(property, value);
      }
    });
  }, []);

  return (
    <ErrorBoundary>
      <AppProviders>
        <OfflineBanner />
        <AppRouter />
      </AppProviders>
    </ErrorBoundary>
  );
}
