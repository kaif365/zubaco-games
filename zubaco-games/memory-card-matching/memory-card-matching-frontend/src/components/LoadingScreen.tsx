import { memo } from 'react';
import { GOLD_DIM } from '@/constants/game.constants';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen = memo(({ message = 'Loading…' }: LoadingScreenProps) => (
  <div className='flex flex-col items-center justify-center gap-5 px-4 max-w-[90%] mx-auto text-center' style={{ height: '100vh' }}>
    <div style={{ position: 'relative', width: '44px', height: '44px' }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: `2px solid rgba(200,148,58,0.1)`,
      }} />
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: `2px solid transparent`,
        borderTopColor: GOLD_DIM,
        animation: 'spin 0.9s linear infinite',
      }} />
    </div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <p style={{
      fontSize: '0.75rem', letterSpacing: '0.16em',
      textTransform: 'uppercase', color: 'rgba(200,170,120,0.45)',
    }}>{message}</p>
  </div>
));

LoadingScreen.displayName = 'LoadingScreen';
export { LoadingScreen };
