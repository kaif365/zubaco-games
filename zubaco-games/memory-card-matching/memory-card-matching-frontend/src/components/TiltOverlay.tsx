import { memo } from 'react';
import { GOLD, GOLD_DIM } from '@/constants/game.constants';
import { useTranslation } from 'react-i18next';

const TiltOverlay = memo(() => {
  const { t } = useTranslation();

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '20px',
      background: 'linear-gradient(180deg, rgba(160,68,12,0.45) 0%, rgba(100,40,8,0.15) 15%, transparent 30%), #0c0904',
      textAlign: 'center', padding: '24px',
    }}>
      {/* Phone icon with rotate hint */}
      <div className="tilt-phone" aria-hidden="true" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p style={{
          margin: 0,
          fontSize: '1rem', fontWeight: 800,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DIM})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          {t('app.tiltTitle')}
        </p>
        <p style={{
          margin: 0, maxWidth: '300px',
          fontSize: '0.8rem', letterSpacing: '0.1em',
          color: 'rgba(220,190,140,0.65)', lineHeight: 1.6,
        }}>
          {t('app.tiltDescription')}
        </p>
      </div>
    </div>
  );
});

TiltOverlay.displayName = 'TiltOverlay';
export { TiltOverlay };
