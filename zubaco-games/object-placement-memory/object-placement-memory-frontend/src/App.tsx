import { AppProviders } from './app/providers/AppProviders';
import { AppRouter } from './app/router/AppRouter';
import { ErrorBoundary } from './app/components/ErrorBoundary';
import { OfflineBanner } from './app/components/OfflineBanner';

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <OfflineBanner />
        <AppRouter />
      </AppProviders>
    </ErrorBoundary>
  );
}
