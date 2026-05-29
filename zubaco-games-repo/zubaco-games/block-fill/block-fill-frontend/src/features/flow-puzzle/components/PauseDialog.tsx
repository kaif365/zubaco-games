import { Play, RotateCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';

interface PauseDialogProps {
  open: boolean;
  onResume: () => void;
  onReset: () => void;
  onExit: () => void;
}

export function PauseDialog({ open, onResume, onReset, onExit }: PauseDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog open={open}>
      <Card className="rounded-[2rem] border-white/12 bg-slate-950/90 shadow-[0_24px_90px_rgba(0,0,0,0.55)]">
        <CardContent className="space-y-6 px-6 py-7 text-center">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-cyan-200/70">
              {t('game.pauseDialog.tag')}
            </p>
            <h3 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white">
              {t('game.pauseDialog.title')}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {t('game.pauseDialog.description')}
            </p>
          </div>
          <div className="grid gap-3">
            <Button
              className="rounded-full bg-cyan-300 text-slate-950 hover:bg-cyan-200"
              onClick={onResume}
            >
              <Play size={16} />
              {t('game.pauseDialog.resume')}
            </Button>
            <Button
              variant="secondary"
              className="rounded-full bg-white/8 text-white hover:bg-white/12"
              onClick={onReset}
            >
              <RotateCcw size={16} />
              {t('game.pauseDialog.restart')}
            </Button>
            <Button
              variant="ghost"
              className="rounded-full text-slate-200 hover:bg-white/8"
              onClick={onExit}
            >
              <X size={16} />
              {t('game.pauseDialog.exit')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Dialog>
  );
}
