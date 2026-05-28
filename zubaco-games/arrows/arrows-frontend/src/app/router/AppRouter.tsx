import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ErrorBoundary } from "@components/shared/ErrorBoundary";
import { PageLoader } from "@components/shared/PageLoader";

const HomePage = lazy(() => import("@pages/HomePage"));
const ArrowGamePage = lazy(() => import("@pages/ArrowGamePage"));
const NotFoundPage = lazy(() => import("@pages/NotFoundPage"));
const LevelEditorPage = import.meta.env.DEV
  ? lazy(() => import("@pages/LevelEditorPage"))
  : null;

export function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<ArrowGamePage />} />
            <Route path="/server" element={<HomePage />} />
            {import.meta.env.DEV && LevelEditorPage && (
              <Route path="/editor" element={<LevelEditorPage />} />
            )}
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
