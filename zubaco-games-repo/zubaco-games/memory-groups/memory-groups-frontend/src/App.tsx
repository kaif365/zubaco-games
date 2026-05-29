import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import { GamePage } from './features/groups/components/GamePage';
import { ThemeProvider } from './hooks/useTheme';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <OfflineBanner />
        <GamePage />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
