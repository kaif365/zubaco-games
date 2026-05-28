import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { GamePage } from '@/features/flash-spot/components/GamePage';

import { ROUTES } from './routes';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={ROUTES.HOME} element={<GamePage />} />
        <Route path={ROUTES.GAME} element={<GamePage />} />
        <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
