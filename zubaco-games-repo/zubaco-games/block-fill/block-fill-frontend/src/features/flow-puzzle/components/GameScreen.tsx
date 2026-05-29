import { Pause, RotateCcw, House, Layers3, Volume2, VolumeX, Undo2, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PhaserFlowBoard } from '@/features/flow-puzzle/components/PhaserFlowBoard';
import { useAudio } from '@/audio';
import type {
  FlowBoardStats,
  FlowPuzzleLevel,
  FlowSessionState,
} from '@/features/flow-puzzle/types';
import { getLevelCols, getLevelRows } from '@/features/flow-puzzle/utils/levelGrid';

interface GameScreenProps {
  level: FlowPuzzleLevel;
  session: FlowSessionState;
  stats: FlowBoardStats;
  elapsedMs: number;
  paused: boolean;
  canUndo?: boolean;
  hintsRemaining?: number;
  onBeginPath: (coord: { row: number; col: number }) => void;
  onDragPath: (coord: { row: number; col: number }) => void;
  onEndPath: () => void;
  onPause: () => void;
  onReset: () => void;
  onExit: () => void;
  onUndo?: () => void;
  onHint?: () => void;
}

function formatElapsed(elapsedMs: number) {
  const totalSec = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function GameScreen({
  level,
  session,
  stats,
  elapsedMs,
  paused,
  canUndo = false,
  hintsRemaining = 0,
  onBeginPath,
  onDragPath,
  onEndPath,
  onPause,
  onReset,
  onExit,
  onUndo,
  onHint,
}: GameScreenProps) {
  const audio = useAudio();
  const rows = getLevelRows(level);
  const cols = getLevelCols(level);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
      <Card className="rounded-[2rem] border-white/12 bg-slate-950/70">
        <CardContent className="space-y-6 px-6 py-7">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
              {level.difficulty}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white">
              {level.name}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{level.description}</p>
          </div>

          <div className="grid gap-3">
            {[
              ['Coverage', `${stats.coveragePercent}%`],
              ['Pairs', `${stats.completedPairs}/${stats.totalPairs}`],
              ['Moves', String(session.moveCount)],
              ['Timer', formatElapsed(elapsedMs)],
              ['Target', `${level.timeLimitSec}s`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-[1.2rem] border border-white/8 bg-white/5 px-4 py-3"
              >
                <span className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</span>
                <span className="text-lg font-semibold text-white">{value}</span>
              </div>
            ))}
          </div>

          <div className="rounded-[1.5rem] border border-white/8 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/80">Controls</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Drag from a glowing node to trace a continuous route. Backtrack by sliding to the
              previous cell, or re-enter your own path to trim and reroute.
            </p>
          </div>

          <div className="grid gap-3">
            <Button
              className="rounded-full bg-cyan-300 text-slate-950 hover:bg-cyan-200"
              onClick={onPause}
              disabled={paused}
            >
              <Pause size={16} />
              Pause
            </Button>
            {onUndo && (
              <Button
                variant="secondary"
                className="rounded-full bg-white/8 text-white hover:bg-white/12"
                onClick={onUndo}
                disabled={!canUndo}
              >
                <Undo2 size={16} />
                Undo
              </Button>
            )}
            {onHint && (
              <Button
                variant="secondary"
                className="rounded-full bg-amber-400/15 text-amber-200 hover:bg-amber-400/25"
                onClick={onHint}
                disabled={hintsRemaining <= 0}
              >
                <Lightbulb size={16} />
                Hint ({hintsRemaining})
              </Button>
            )}
            <Button
              variant="secondary"
              className="rounded-full bg-white/8 text-white hover:bg-white/12"
              onClick={onReset}
            >
              <RotateCcw size={16} />
              Reset Level
            </Button>
            <Button
              variant="secondary"
              className="rounded-full bg-white/8 text-white hover:bg-white/12"
              onClick={() => audio.toggleMuted()}
            >
              {audio.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              {audio.muted ? 'Unmute' : 'Mute'}
            </Button>
            <Button
              variant="ghost"
              className="rounded-full text-slate-200 hover:bg-white/8"
              onClick={onExit}
            >
              <House size={16} />
              Levels
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <div className="flex items-center justify-between rounded-[1.5rem] border border-white/8 bg-white/6 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">Active Board</p>
            <div className="mt-2 flex items-center gap-2 text-slate-200">
              <Layers3 size={16} />
              <span className="text-sm">
                {rows}x{cols} grid, {level.nodes.length} color pairs
              </span>
            </div>
          </div>
          <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-300">
            Full coverage {level.objectives?.requireFullCoverage ? 'on' : 'off'}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(92,242,255,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4 sm:p-5">
          <PhaserFlowBoard
            level={level}
            session={session}
            disabled={paused}
            onBeginPath={onBeginPath}
            onDragPath={onDragPath}
            onEndPath={onEndPath}
          />
        </div>
      </div>
    </div>
  );
}
