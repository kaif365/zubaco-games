import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GamePage } from '@/features/object-placement/components/GamePage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<GamePage />} />
      </Routes>
    </BrowserRouter>
  );
}
