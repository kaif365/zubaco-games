import { Trophy, RotateCcw, List, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Confetti } from '@/features/flow-puzzle/components/Confetti';
import type { FlowPuzzleLevel, FlowWinSummary } from '@/features/flow-puzzle/types';

interface WinDialogProps {
  level: FlowPuzzleLevel;
  summary: FlowWinSummary | null;
  open: boolean;
  hasNextLevel: boolean;
  onNextLevel: () => void;
  onReplay: () => void;
  onExit: () => void;
}

export function WinDialog({
  level,
  summary,
  open,
  hasNextLevel,
  onNextLevel,
  onReplay,
  onExit,
}: WinDialogProps) {
  const { t } = useTranslation();
  return (
    <>
      <Confetti show={open} />
      <Dialog open={open}>
      <Card className="rounded-[2rem] border-white/12 bg-slate-950/92 shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
        <CardContent className="space-y-6 px-6 py-7">
          <div className="flex items-center gap-4">
            <div className="rounded-[1.35rem] border border-amber-300/20 bg-amber-300/10 p-4 text-amber-200">
              <Trophy size={26} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">
                {t('game.winDialog.tag')}
              </p>
              <h3 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white">
                {level.name}
              </h3>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              [t('game.winDialog.score'), String(summary?.score ?? 0)],
              [t('game.winDialog.time'), `${summary?.elapsedSec ?? 0}s`],
              [t('game.winDialog.target'), `${level.timeLimitSec}s`],
            ].map(([title, value]) => (
              <div key={title} className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{title}</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">{value}</p>
              </div>
            ))}
          </div>

          <p className="text-sm leading-6 text-slate-300">{t('game.winDialog.scoreNote')}</p>

          <div className="grid gap-3 sm:grid-cols-3">
            <Button
              className="rounded-full bg-cyan-300 text-slate-950 hover:bg-cyan-200"
              onClick={onReplay}
            >
              <RotateCcw size={16} />
              {t('game.winDialog.replay')}
            </Button>
            <Button
              variant="secondary"
              className="rounded-full bg-white/8 text-white hover:bg-white/12"
              onClick={hasNextLevel ? onNextLevel : onExit}
            >
              <ArrowRight size={16} />
              {hasNextLevel ? t('game.winDialog.nextLevel') : t('game.winDialog.finishPack')}
            </Button>
            <Button
              variant="ghost"
              className="rounded-full bg-white/8 text-white hover:bg-white/12"
              onClick={onExit}
            >
              <List size={16} />
              {t('game.winDialog.levelSelect')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Dialog>
    </>
  );
}
