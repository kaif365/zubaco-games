import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import { GamePage } from './features/blitz/components/GamePage';

export default function App() {
  return (
    <ErrorBoundary>
      <OfflineBanner />
      <GamePage />
    </ErrorBoundary>
  );
}
