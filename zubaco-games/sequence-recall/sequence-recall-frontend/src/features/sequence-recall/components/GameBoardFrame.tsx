import { motion } from 'framer-motion';
import {
  AudioWaveform,
  Disc,
  Music,
  Music2,
  Music3,
  Music4,
  type LucideIcon,
} from 'lucide-react';

import { IMAGES } from '@/assets/images';
import { cn } from '@/lib/utils';

// Backward compatibility export if imported elsewhere
export const LEAF_ASSET_MAP: Record<number, { idle: string; active: string; wrong: string }> = {
  1: { idle: IMAGES.leafBlue, active: IMAGES.leafBlueActive, wrong: IMAGES.leafBlueWrong },
  2: { idle: IMAGES.leafGold, active: IMAGES.leafGoldActive, wrong: IMAGES.leafGoldWrong },
  3: { idle: IMAGES.leafMaroon, active: IMAGES.leafMaroonActive, wrong: IMAGES.leafMaroonWrong },
  4: { idle: IMAGES.leafGreen, active: IMAGES.leafGreenActive, wrong: IMAGES.leafGreenWrong },
  5: { idle: IMAGES.leafBlue, active: IMAGES.leafBlueActive, wrong: IMAGES.leafBlueWrong },
  6: { idle: IMAGES.leafGold, active: IMAGES.leafGoldActive, wrong: IMAGES.leafGoldWrong },
};

export type TileLabel =
  | string
  | { src: string; alt: string; className?: string }
  | { number?: string; symbol?: string; label?: string };

export const DEFAULT_TILE_LABELS: Record<
  number,
  { key: string; note: string; icon: LucideIcon }
> = {
  1: { key: '1', note: '♪', icon: Music2 },
  2: { key: '2', note: '♫', icon: Music },
  3: { key: '3', note: '♬', icon: Music3 },
  4: { key: '4', note: '♩', icon: Music4 },
  5: { key: '5', note: '≋', icon: AudioWaveform },
  6: { key: '6', note: '◎', icon: Disc },
};

interface TileTheme {
  name: string;
  idleBg: string;
  activeBg: string;
  activeGlow: string;
  wrongBg: string;
  textColor: string;
  activeTextColor: string;
  borderColor: string;
  activeBorderColor: string;
}

const TILE_THEMES: Record<number, TileTheme> = {
  1: {
    name: 'Cyan / Electric Blue',
    idleBg: 'from-cyan-950/70 via-blue-950/80 to-slate-900/90',
    activeBg: 'from-cyan-400 via-sky-400 to-blue-500',
    activeGlow: 'rgba(6, 182, 212, 0.95)',
    wrongBg: 'from-rose-600 to-red-700',
    textColor: 'text-cyan-300',
    activeTextColor: 'text-slate-950',
    borderColor: 'border-cyan-500/40 hover:border-cyan-400/80',
    activeBorderColor: 'border-white',
  },
  2: {
    name: 'Amber / Neon Gold',
    idleBg: 'from-amber-950/70 via-yellow-950/80 to-slate-900/90',
    activeBg: 'from-amber-300 via-yellow-400 to-amber-500',
    activeGlow: 'rgba(245, 158, 11, 0.95)',
    wrongBg: 'from-rose-600 to-red-700',
    textColor: 'text-amber-300',
    activeTextColor: 'text-slate-950',
    borderColor: 'border-amber-500/40 hover:border-amber-400/80',
    activeBorderColor: 'border-white',
  },
  3: {
    name: 'Magenta / Neon Purple',
    idleBg: 'from-purple-950/70 via-fuchsia-950/80 to-slate-900/90',
    activeBg: 'from-fuchsia-400 via-pink-500 to-purple-600',
    activeGlow: 'rgba(217, 70, 239, 0.95)',
    wrongBg: 'from-rose-600 to-red-700',
    textColor: 'text-purple-300',
    activeTextColor: 'text-white',
    borderColor: 'border-purple-500/40 hover:border-purple-400/80',
    activeBorderColor: 'border-white',
  },
  4: {
    name: 'Emerald / Neon Mint',
    idleBg: 'from-emerald-950/70 via-teal-950/80 to-slate-900/90',
    activeBg: 'from-emerald-400 via-teal-400 to-emerald-500',
    activeGlow: 'rgba(16, 185, 129, 0.95)',
    wrongBg: 'from-rose-600 to-red-700',
    textColor: 'text-emerald-300',
    activeTextColor: 'text-slate-950',
    borderColor: 'border-emerald-500/40 hover:border-emerald-400/80',
    activeBorderColor: 'border-white',
  },
  5: {
    name: 'Sunset Orange',
    idleBg: 'from-orange-950/70 via-amber-950/80 to-slate-900/90',
    activeBg: 'from-orange-400 via-amber-400 to-red-500',
    activeGlow: 'rgba(249, 115, 22, 0.95)',
    wrongBg: 'from-rose-600 to-red-700',
    textColor: 'text-orange-300',
    activeTextColor: 'text-slate-950',
    borderColor: 'border-orange-500/40 hover:border-orange-400/80',
    activeBorderColor: 'border-white',
  },
  6: {
    name: 'Electric Indigo',
    idleBg: 'from-indigo-950/70 via-blue-950/80 to-slate-900/90',
    activeBg: 'from-indigo-400 via-blue-400 to-violet-500',
    activeGlow: 'rgba(99, 102, 241, 0.95)',
    wrongBg: 'from-rose-600 to-red-700',
    textColor: 'text-indigo-300',
    activeTextColor: 'text-white',
    borderColor: 'border-indigo-500/40 hover:border-indigo-400/80',
    activeBorderColor: 'border-white',
  },
};

function getTileTheme(tileId: number): TileTheme {
  return TILE_THEMES[tileId] ?? TILE_THEMES[((tileId - 1) % 4) + 1];
}

export function getGridCols(count: number): string {
  if (count <= 2) return 'grid-cols-2';
  if (count <= 3) return 'grid-cols-3';
  if (count <= 4) return 'grid-cols-2';
  if (count === 5) return 'grid-cols-2 sm:grid-cols-3';
  return 'grid-cols-2 sm:grid-cols-3';
}

// ── Interactive variant (gameplay) ────────────────────────────────────────────

interface InteractiveTileProps {
  tileId: number;
  isPlaybackActive: boolean;
  isInputActive: boolean;
  isWrong: boolean;
  disabled: boolean;
  label?: TileLabel;
  onClick: (tileId: number) => void;
}

function InteractiveTile({
  tileId,
  isPlaybackActive,
  isInputActive,
  isWrong,
  disabled,
  onClick,
}: InteractiveTileProps) {
  const theme = getTileTheme(tileId);
  const isActive = isPlaybackActive || isInputActive;
  const tileConfig = DEFAULT_TILE_LABELS[tileId] ?? DEFAULT_TILE_LABELS[1];
  const IconComponent = tileConfig.icon;

  return (
    <motion.button
      type="button"
      onClick={() => onClick(tileId)}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      animate={{
        scale: isActive ? 1.04 : 1,
        boxShadow: isWrong
          ? '0 0 35px rgba(244, 63, 94, 0.95)'
          : isActive
            ? `0 0 35px ${theme.activeGlow}, inset 0 0 15px rgba(255, 255, 255, 0.4)`
            : '0 4px 15px rgba(0, 0, 0, 0.35)',
      }}
      transition={{ duration: 0.08 }}
      className={cn(
        'relative aspect-square w-full rounded-2xl sm:rounded-3xl flex items-center justify-center border-2 transition-colors duration-75 select-none',
        isWrong
          ? `bg-gradient-to-br ${theme.wrongBg} border-rose-300 text-white`
          : isActive
            ? `bg-gradient-to-br ${theme.activeBg} ${theme.activeBorderColor} ${theme.activeTextColor}`
            : `bg-gradient-to-br ${theme.idleBg} ${theme.borderColor} ${theme.textColor} backdrop-blur-md`,
        disabled ? 'cursor-not-allowed opacity-90' : 'cursor-pointer hover:brightness-110',
      )}
      aria-label={`Tile ${String(tileId)}`}
    >
      {/* Ambient glass reflection */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-white/15 via-transparent to-black/20" />

      {/* Subtle keyboard shortcut hint in top corner */}
      <span
        className={cn(
          'pointer-events-none absolute top-2.5 right-3 text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.5 rounded-md border transition-colors',
          isActive
            ? 'bg-black/25 border-black/20 text-current'
            : 'bg-white/5 border-white/10 text-white/40',
        )}
        title={`Press ${tileId} on keyboard`}
      >
        {tileId}
      </span>

      {/* Center: Large, glowing Musical Rhythm icon and note symbol */}
      <div className="pointer-events-none flex flex-col items-center justify-center gap-1.5">
        <IconComponent
          size={42}
          strokeWidth={2.3}
          className={cn(
            'transition-transform duration-100 drop-shadow-md',
            isActive ? 'scale-110' : 'scale-100',
            isActive ? theme.activeTextColor : theme.textColor,
          )}
        />
        <span
          className={cn(
            'text-xs sm:text-sm font-semibold tracking-widest transition-opacity',
            isActive ? 'opacity-90 font-bold' : 'opacity-40',
            isActive ? theme.activeTextColor : theme.textColor,
          )}
        >
          {tileConfig.note}
        </span>
      </div>
    </motion.button>
  );
}

// ── Decorative variant (lobby) ────────────────────────────────────────────────

interface DecorativeTileProps {
  tileId: number;
  index: number;
  label?: TileLabel;
}

function DecorativeTile({ tileId, index }: DecorativeTileProps) {
  const theme = getTileTheme(tileId);
  const tileConfig = DEFAULT_TILE_LABELS[tileId] ?? DEFAULT_TILE_LABELS[1];
  const IconComponent = tileConfig.icon;

  return (
    <motion.div
      className={cn(
        'relative aspect-square w-full rounded-2xl sm:rounded-3xl flex items-center justify-center border-2 backdrop-blur-md select-none',
        `bg-gradient-to-br ${theme.idleBg} ${theme.borderColor} ${theme.textColor}`,
      )}
      animate={{
        boxShadow: [
          '0 4px 15px rgba(0, 0, 0, 0.4)',
          `0 0 25px ${theme.activeGlow}`,
          '0 4px 15px rgba(0, 0, 0, 0.4)',
        ],
      }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: index * 0.35 }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-white/10 via-transparent to-black/20" />
      <span className="pointer-events-none absolute top-2.5 right-3 text-[10px] font-mono font-bold opacity-30">
        {tileId}
      </span>
      <div className="flex flex-col items-center justify-center gap-1.5">
        <IconComponent size={40} strokeWidth={2.3} className="drop-shadow-md" />
        <span className="text-xs font-semibold opacity-40">{tileConfig.note}</span>
      </div>
    </motion.div>
  );
}

// ── Shared frame ──────────────────────────────────────────────────────────────

interface GameBoardFrameInteractiveProps {
  variant: 'interactive';
  boxCount: number;
  tileLabels?: Record<number, TileLabel>;
  disabled: boolean;
  isPlaybackActive: (tileId: number) => boolean;
  isInputActive: (tileId: number) => boolean;
  onTileClick: (tileId: number) => void;
  showCompletedTick?: boolean;
  wrongTileId?: number | null;
}

interface GameBoardFrameDecorativeProps {
  variant: 'decorative';
  boxCount?: number;
  tileLabels?: Record<number, TileLabel>;
  showCompletedTick?: boolean;
}

export type GameBoardFrameProps =
  | GameBoardFrameInteractiveProps
  | GameBoardFrameDecorativeProps;

export function GameBoardFrame(props: GameBoardFrameProps) {
  const boxCount = props.boxCount ?? 4;
  const tiles = Array.from({ length: boxCount }, (_, i) => i + 1);
  const wrongTileId = props.variant === 'interactive' ? (props.wrongTileId ?? null) : null;

  return (
    <div className="relative mx-auto w-full max-w-[340px] sm:max-w-[380px] md:max-w-[420px] aspect-square flex items-center justify-center p-2 sm:p-4">
      {/* Outer ambient glow */}
      <div className="pointer-events-none absolute inset-0 rounded-[40px] bg-indigo-500/10 blur-2xl" />

      {/* Modern Console Chassis */}
      <div className="relative w-full h-full rounded-[28px] sm:rounded-[36px] bg-slate-900/85 backdrop-blur-xl border border-slate-700/50 p-3 sm:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.08)] flex items-center justify-center">
        {/* Grid of tiles with clean spacing and no overlapping elements */}
        <div
          className={cn(
            'relative z-10 grid w-full h-full gap-3 sm:gap-4',
            getGridCols(boxCount),
          )}
          role={props.variant === 'interactive' ? 'group' : undefined}
          aria-label={props.variant === 'interactive' ? 'Sequence tiles' : undefined}
          data-testid={props.variant === 'interactive' ? 'sequence-board-grid' : undefined}
        >
          {tiles.map((tileId, index) => {
            const label = props.tileLabels?.[tileId];
            if (props.variant === 'interactive') {
              return (
                <InteractiveTile
                  key={tileId}
                  tileId={tileId}
                  isPlaybackActive={props.isPlaybackActive(tileId)}
                  isInputActive={props.isInputActive(tileId)}
                  isWrong={wrongTileId === tileId}
                  disabled={props.disabled}
                  label={label}
                  onClick={props.onTileClick}
                />
              );
            }
            return <DecorativeTile key={tileId} tileId={tileId} index={index} label={label} />;
          })}
        </div>
      </div>
    </div>
  );
}
