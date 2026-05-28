import { useTranslation } from 'react-i18next';

import { Progress } from '@/components/ui/progress';
import { GAME_PHASE } from '@/types/game';
import type { GameState } from '@/types/game';

interface RoundFeedbackProps {
  state: GameState;
  maxRounds: number;
  isErrorCue?: boolean;
  isSuccessCue?: boolean;
}

export function RoundFeedback({ state, maxRounds }: RoundFeedbackProps) {
  const { t } = useTranslation();

  const completedRounds =
    state.phase === GAME_PHASE.ROUND_SUCCESS || state.phase === GAME_PHASE.SESSION_COMPLETE
      ? state.round
      : Math.max(state.round - 1, 0);
  const completion =
    maxRounds > 0 ? Math.min(100, Math.round((completedRounds / maxRounds) * 100)) : 0;

  const rawFeedbackKey =
    state.phase === GAME_PHASE.ROUND_FAILURE ? 'game.feedback.yourTurn' : state.feedback;

  const feedbackText =
    rawFeedbackKey === 'game.feedback.watchPattern'
      ? t('game.feedback.watchPattern', { length: state.revealedSequence.length })
      : t(rawFeedbackKey, { defaultValue: rawFeedbackKey });

  const phaseTag =
    state.phase === GAME_PHASE.SHOWING_SEQUENCE
      ? t('game.roundFeedback.watch')
      : t('game.roundFeedback.turn');

  return (
    <div className="rounded-[22px] border border-cyan-200/10 bg-[linear-gradient(180deg,rgba(9,17,38,0.82),rgba(6,10,24,0.92))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full border border-cyan-300/12 bg-cyan-400/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/70">
              {phaseTag}
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-100/40">
              {t('game.roundFeedback.sequenceFlow')}
            </span>
          </div>
          <p className="text-sm text-slate-200/90">{feedbackText}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-2xl font-semibold leading-none text-slate-100">
            {completedRounds}
            {maxRounds > 0 ? (
              <span className="text-sm text-cyan-200/70">/{String(maxRounds)}</span>
            ) : null}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-cyan-100/40">
            {t('game.roundFeedback.cleared')}
          </p>
        </div>
      </div>
      <Progress value={completion} className="mt-3 h-1.5 bg-cyan-200/10" />
    </div>
  );
}
