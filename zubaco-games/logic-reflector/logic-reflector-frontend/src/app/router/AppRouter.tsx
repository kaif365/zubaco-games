import { Suspense, lazy, type ComponentType } from 'react';
import type { LazyExoticComponent } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { PageLoader } from '@/components/shared/PageLoader';

const GamePage = lazy(() => import('@/pages/GamePage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

// DEV-only: tree-shaken out of production builds
const LevelEditorPage: LazyExoticComponent<ComponentType> | null = import.meta.env.DEV
  ? lazy(() => import('@/pages/LevelEditorPage'))
  : null;

export function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <div className="bg-background min-h-[100dvh]">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<GamePage />} />
              <Route path="/404" element={<NotFoundPage />} />
              {import.meta.env.DEV && LevelEditorPage && (
                <Route
                  path="/editor"
                  element={
                    <Suspense fallback={<div style={{ color: 'white', padding: 20 }}>Loading editor…</div>}>
                      <LevelEditorPage />
                    </Suspense>
                  }
                />
              )}
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </Suspense>
        </div>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
