import { AppProviders } from './app/providers/AppProviders';
import { AppRouter } from './app/router/AppRouter';
import { ErrorBoundary } from './app/components/ErrorBoundary';
import { OfflineBanner } from './app/components/OfflineBanner';
import { ThemeProvider } from './hooks/useTheme';

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppProviders>
          <OfflineBanner />
          <AppRouter />
        </AppProviders>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
