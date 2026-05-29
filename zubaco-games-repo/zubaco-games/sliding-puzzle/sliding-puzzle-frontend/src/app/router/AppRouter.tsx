import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ErrorBoundary } from '@components/shared/ErrorBoundary';
import { PageLoader } from '@components/shared/PageLoader';

const SlidingPuzzlePage = lazy(() => import('@pages/SlidingPuzzlePage'));
const NotFoundPage = lazy(() => import('@pages/NotFoundPage'));
const GameEditorPage = import.meta.env.DEV
  ? lazy(() => import('@/pages/GameEditor').then((m) => ({ default: m.GameEditorPage })))
  : null;

export function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <div className="bg-background min-h-[100dvh]">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<SlidingPuzzlePage />} />
              <Route path="/game" element={<Navigate to="/" replace />} />
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
              {import.meta.env.DEV && GameEditorPage && (
                <Route path="/editor" element={<GameEditorPage />} />
              )}
            </Routes>
          </Suspense>
        </div>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
