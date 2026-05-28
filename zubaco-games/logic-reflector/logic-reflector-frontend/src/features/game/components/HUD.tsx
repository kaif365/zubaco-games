import { motion } from 'framer-motion';
import type { LevelScore } from '@/types/logic-reflector';

interface Props {
  levelNumber: number;
  totalLevels: number;
  levelScores: LevelScore[];
  combo?: number;
  moves?: number;
  onForfeit?: () => void;
  onPause?: () => void;
  onMute?: () => void;
}

export function HUD({ levelNumber, totalLevels, levelScores, combo = 0, moves = 0, onForfeit, onPause, onMute }: Props) {
  return (
    <header className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-primary font-bold tracking-wider text-sm">
          Level {levelNumber}
          <span className="text-muted-foreground font-normal"> / {totalLevels}</span>
        </span>

        {/* Level dots */}
        <div className="flex gap-1">
          {Array.from({ length: totalLevels }, (_, i) => {
            const lvNum = i + 1;
            const score = levelScores.find((s) => s.levelNumber === lvNum);
            const done = !!score;
            const active = lvNum === levelNumber;
            return (
              <div
                key={lvNum}
                className={`w-2 h-2 rounded-full transition-colors ${
                  done
                    ? 'bg-primary'
                    : active
                      ? 'bg-primary/60 ring-1 ring-primary'
                      : 'bg-muted'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Center: combo + moves */}
      <div className="flex items-center gap-3">
        {combo >= 2 && (
          <motion.span
            key={combo}
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-xs font-bold text-amber-400"
          >
            🔥 ×{combo}
          </motion.span>
        )}
        {moves > 0 && (
          <span className="text-xs text-muted-foreground">{moves} moves</span>
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2">
        {onMute && (
          <button type="button" onClick={onMute} className="text-xs text-muted-foreground hover:text-primary transition-colors" title="Toggle sound">
            🔊
          </button>
        )}
        {onPause && (
          <button type="button" onClick={onPause} className="text-xs text-muted-foreground hover:text-primary transition-colors" title="Pause">
            ⏸️
          </button>
        )}
        {onForfeit && (
          <button
            type="button"
            onClick={onForfeit}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Quit
          </button>
        )}
      </div>
    </header>
  );
}
