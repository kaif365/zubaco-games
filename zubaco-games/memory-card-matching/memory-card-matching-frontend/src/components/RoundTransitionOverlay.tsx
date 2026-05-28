import { useTranslation } from 'react-i18next';

interface RoundTransitionOverlayProps {
  show: boolean;
}

export function RoundTransitionOverlay({ show }: RoundTransitionOverlayProps) {
  const { t } = useTranslation();

  if (!show) return null;

  return (
    <div className="round-transition-slot">
      <div className="round-transition-stack" role="status" aria-live="polite">
        <p className="round-transition-text">{t('game.roundTransition.nextRound')}</p>
      </div>
    </div>
  );
}
