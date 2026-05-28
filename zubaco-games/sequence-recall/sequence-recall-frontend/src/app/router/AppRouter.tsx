import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ErrorBoundary } from '@components/shared/ErrorBoundary';
import HomePage from '@pages/HomePage';
import NotFoundPage from '@pages/NotFoundPage';

/**
 * App router.
 *
 * @returns {JSX.Element} The rendered element.
 */
export function AppRouter() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
