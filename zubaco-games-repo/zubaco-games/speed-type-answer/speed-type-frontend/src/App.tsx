import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import { GamePage } from './components/GamePage';
import { ThemeProvider } from './hooks/useTheme';
import './globals.css';

const qc = new QueryClient();

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={qc}>
          <OfflineBanner />
          <GamePage />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
