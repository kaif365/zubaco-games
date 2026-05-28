import { GOLD, GOLD_LIGHT, GOLD_DIM } from '@/constants/game.constants';
import { useTranslation } from 'react-i18next';

interface StartScreenProps {
  onPlay: () => void;
}

export function StartScreen({ onPlay }: StartScreenProps) {
  const { t } = useTranslation();

  return (
    <div
      className="start-screen"
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'space-between',
        height: '100%', padding: '0 28px 40px',
        overflow: 'hidden',
      }}
    >
      {/* spacer – hidden in landscape via CSS */}
      <div className="start-spacer" style={{ flex: '0 0 80px' }} />

      {/* Title — becomes left panel in landscape */}
      <div
        className="start-left"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}
      >
        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', opacity: 0.5 }}>
          {['♠', '♥', '♦', '♣'].map((s, i) => (
            <span key={i} style={{ fontSize: '1.4rem', color: GOLD_DIM }}>{s}</span>
          ))}
        </div>
        <h1 style={{
          margin: 0, fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.01em',
          background: `linear-gradient(180deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%, ${GOLD_DIM} 100%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          {t('app.startTitle')}
        </h1>
        <p style={{
          margin: 0, fontSize: '0.75rem', letterSpacing: '0.12em',
          color: 'rgba(200,170,120,0.45)', textTransform: 'uppercase',
        }}>
          {t('app.startTagline')}
        </p>
        <p style={{
          margin: '8px 0 0', fontSize: '0.65rem', letterSpacing: '0.08em', textAlign: 'center',
          color: 'rgba(200,170,120,0.32)', lineHeight: 1.4, maxWidth: '280px',
        }}>
          {t('app.startDescription')}
        </p>
      </div>

      {/* Controls — becomes right panel in landscape */}
      <div
        className="start-right"
        style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}
      >
        {/* Play button */}
        <div className="start-play-wrap" style={{ width: '100%', marginTop: '8px' }}>
          <button
            onClick={() => onPlay()}
            style={{
              width: '100%', padding: '16px', borderRadius: '999px', border: 'none',
              background: `linear-gradient(135deg, #7a5018, #c8943a, #7a5018)`,
              color: '#1a0e04', fontSize: '0.95rem', fontWeight: 800,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              cursor: 'pointer', boxShadow: '0 4px 24px rgba(150,100,20,0.4)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 32px rgba(150,100,20,0.55)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(150,100,20,0.4)';
            }}
          >
            {t('app.startPlay')}
          </button>
        </div>
      </div>
    </div>
  );
}
