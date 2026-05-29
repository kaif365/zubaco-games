import { ArrowLeft, Clock3, Grid3X3, Layers3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { FlowLevelPack } from '@/features/flow-puzzle/types';
import { getLevelCols, getLevelRows } from '@/features/flow-puzzle/utils/levelGrid';

interface LevelSelectScreenProps {
  packs: FlowLevelPack[];
  onBack: () => void;
  onSelectPack: (packId: string) => void;
}

export function LevelSelectScreen({ packs, onBack, onSelectPack }: LevelSelectScreenProps) {
  return (
    <Card className="rounded-[2rem] border-white/12 bg-slate-950/65">
      <CardContent className="space-y-8 px-6 py-8 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Grid Select</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white">
              Choose Your Board Size
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Each grid size is a mini campaign with multiple handcrafted JSON levels.
            </p>
          </div>
          <Button
            variant="ghost"
            className="rounded-full text-slate-200 hover:bg-white/8"
            onClick={onBack}
          >
            <ArrowLeft size={18} />
            Home
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {packs.map((pack) => {
            const firstLevel = pack.levels[0];
            const lastLevel = pack.levels[pack.levels.length - 1];
            const rows = firstLevel ? getLevelRows(firstLevel) : 0;
            const cols = firstLevel ? getLevelCols(firstLevel) : 0;

            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => onSelectPack(pack.id)}
                className={cn(
                  'group rounded-[1.75rem] border border-white/10 p-5 text-left transition-all hover:-translate-y-1 hover:border-white/20',
                  'bg-[linear-gradient(165deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]',
                )}
              >
                <div
                  className="h-2 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${firstLevel?.theme.boardGradient[0] ?? '#081224'}, ${firstLevel?.theme.accent ?? '#5cf2ff'})`,
                    boxShadow: `0 0 18px ${firstLevel?.theme.backgroundGlow ?? 'rgba(92,242,255,0.2)'}`,
                  }}
                />
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase text-white font-sans font-semibold">
                      {firstLevel?.difficulty} to {lastLevel?.difficulty}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                      {rows} x {cols}
                    </h3>
                  </div>
                  <div
                    className="rounded-full border border-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
                    style={{ color: firstLevel?.theme.accent ?? '#5cf2ff' }}
                  >
                    {pack.levels.length} levels
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{pack.themeName}</p>
                <div className="mt-5 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Grid3X3 size={14} />
                    {rows}x{cols}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Layers3 size={14} />
                    {firstLevel?.nodes.length ?? 0} pairs
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 size={14} />
                    {firstLevel?.timeLimitSec ?? 0}-{lastLevel?.timeLimitSec ?? 0}s
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
