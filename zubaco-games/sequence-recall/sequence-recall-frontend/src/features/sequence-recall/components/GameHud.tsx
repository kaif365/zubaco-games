import { Flame, Heart, Pause, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import type { GameState } from '@/types/game';

interface GameHudProps {
  state: GameState;
}

export function GameHud({ state }: GameHudProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3" data-testid="hud-panel" data-tutorial-target="hud">
      <div className="flex items-center justify-between text-cyan-100/95">
        <div className="hud-chip flex items-center gap-1.5 text-xs">
          {Array.from({ length: state.lives }).map((_, idx) => (
            <Heart key={idx} size={14} className="fill-pink-300 text-pink-300" />
          ))}
        </div>

        <p className="text-sm font-semibold tracking-[0.2em] text-cyan-300">
          {t('game.level').toUpperCase()} {state.level}
        </p>

        <div className="h-7 w-7 rounded-full border border-cyan-300/35 bg-cyan-300/10 p-1.5 text-cyan-200">
          <Pause size={14} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <HudItem icon={<Trophy size={13} />} label={t('hud.score')} value={state.score} accent="success" />
        <HudItem icon={<Flame size={13} />} label={t('hud.combo')} value={state.streak} />
        <HudItem
          icon={<Heart size={13} />}
          label={t('hud.lives')}
          value={state.lives}
          accent={state.lives <= 1 ? 'danger' : 'default'}
        />
      </div>
    </div>
  );
}

function HudItem({
  icon,
  label,
  value,
  accent = 'default',
}: {
  icon: ReactNode;
  label: string;
  value: number;
  accent?: 'default' | 'success' | 'danger';
}) {
  return (
    <div className="rounded-lg border border-cyan-200/10 bg-slate-950/40 p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-[13px] uppercase tracking-[0.12em] text-cyan-100/60">
        {icon}
        <span>{label}</span>
      </div>
      <Badge variant={accent} className="text-xs">
        {value}
      </Badge>
    </div>
  );
}
