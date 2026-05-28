import { useEffect } from 'react';

import { appConfig } from '@app/config/appConfig';
import { AppProviders } from '@app/providers/AppProviders';
import { AppRouter } from '@app/router/AppRouter';

import { buildGameThemeStyle } from './utils/gameThemeStyle';
import { disableDevTools, disableCopyAndSelection } from './utils/security';

/**
 * App.
 *
 * @returns {JSX.Element} The rendered element.
 */
export default function App() {
  useEffect(() => {
    const themeStyle = buildGameThemeStyle(appConfig.socket.stageNumber);
    Object.entries(themeStyle).forEach(([property, value]) => {
      if (typeof value === 'string') {
        document.documentElement.style.setProperty(property, value);
      }
    });
  }, []);

  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        document.querySelectorAll('img').forEach((img) => {
          const src = img.src;
          img.src = '';
          img.src = src;
        });
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  // New — disable devtools + copy/selection
  useEffect(() => {
    const cleanupDevTools = disableDevTools();
    const cleanupCopy = disableCopyAndSelection();

    return () => {
      cleanupDevTools();
      cleanupCopy();
    };
  }, []);

  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
