import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from '@/app/components/ErrorBoundary';
import { OfflineBanner } from '@/app/components/OfflineBanner';
import { ThemeProvider } from '@/app/hooks/useTheme';
import { AudioProvider } from '@/audio/AudioProvider';
import { GamePage } from '@/features/colour-sorting/components/GamePage';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={qc}>
          <AudioProvider>
            <OfflineBanner />
            <BrowserRouter>
              <Routes>
                <Route path="/*" element={<GamePage />} />
              </Routes>
            </BrowserRouter>
          </AudioProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
