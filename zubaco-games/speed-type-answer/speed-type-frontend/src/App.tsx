import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import { GamePage } from './components/GamePage';
import './globals.css';

const qc = new QueryClient();

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={qc}>
        <OfflineBanner />
        <GamePage />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
