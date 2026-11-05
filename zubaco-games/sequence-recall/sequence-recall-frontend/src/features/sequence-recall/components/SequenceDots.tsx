import { cn } from '@/lib/utils';
import { BOARD_MODE, type BoardMode, type TileId } from '@/types/game';

const dotColorClassByTile: Record<number, string> = {
  // Matches modern neon arcade pad palette: Cyan, Amber, Magenta, Emerald
  1: 'bg-cyan-400',
  2: 'bg-amber-400',
  3: 'bg-fuchsia-400',
  4: 'bg-emerald-400',
  5: 'bg-orange-400',
  6: 'bg-indigo-400',
};

const dotBorderColorClassByTile: Record<number, string> = {
  1: 'border-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.8)]',
  2: 'border-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
  3: 'border-fuchsia-300 shadow-[0_0_8px_rgba(217,70,239,0.8)]',
  4: 'border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
  5: 'border-orange-300 shadow-[0_0_8px_rgba(249,115,22,0.8)]',
  6: 'border-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.8)]',
};

interface SequenceDotsProps {
  mode: BoardMode;
  sequenceLength: number;
  clickedSequence: TileId[];
}

/**
 * Sequence dots.
 *
 * @param {SequenceDotsProps} props - Component props.
 * @param {"idle" | "playback" | "input"} props.mode - The mode.
 * @param {number} props.sequenceLength - The sequence length.
 * @param {number[]} props.clickedSequence - The clicked sequence.
 *
 * @returns {JSX.Element | null} The rendered element.
 */
export function SequenceDots({ mode, sequenceLength, clickedSequence }: SequenceDotsProps) {
  if (sequenceLength === 0) return null;
  const shouldShow = mode === BOARD_MODE.INPUT || clickedSequence.length > 0;

  return (
    <div className={cn('z-10 flex items-center justify-center gap-1.5', !shouldShow && 'invisible')}>
      {Array.from({ length: sequenceLength }).map((_, idx) => {
        const isFilled = idx < clickedSequence.length;
        const clickedTile = clickedSequence[idx] ?? 1;
        const fillClass = isFilled ? dotColorClassByTile[clickedTile] : 'bg-slate-800/80';
        const borderClass = isFilled ? dotBorderColorClassByTile[clickedTile] : 'border-slate-700/60';

        return (
          <div
            key={idx}
            className={cn(
              'h-2.5 w-2.5 rounded-full border transition-all duration-150',
              fillClass,
              borderClass,
              isFilled && 'scale-110',
            )}
          />
        );
      })}
    </div>
  );
}
