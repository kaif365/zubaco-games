import { cn } from '@/lib/utils';
import { BOARD_MODE, type BoardMode, type TileId } from '@/types/game';

const dotColorClassByTile: Record<number, string> = {
  // Match board leaf palette: blue, gold, maroon, green.
  1: 'bg-[#3249A7]',
  2: 'bg-[#A57912]',
  3: 'bg-[#91233A]',
  4: 'bg-[#2F7B3C]',
  5: 'bg-[#3249A7]',
  6: 'bg-[#A57912]',
};

const dotBorderColorClassByTile: Record<number, string> = {
  1: 'border-[#0077FF]',
  2: 'border-[#FEE605]',
  3: 'border-[#FA9494]',
  4: 'border-[#B6FA2A]',
  5: 'border-[#0077FF]',
  6: 'border-[#FEE605]',
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
    <div className={cn('z-10 flex items-center justify-center gap-1', !shouldShow && 'invisible')}>
      {Array.from({ length: sequenceLength }).map((_, idx) => {
        const isFilled = idx < clickedSequence.length;
        const clickedTile = clickedSequence[idx] ?? 1;
        const fillClass = isFilled ? dotColorClassByTile[clickedTile] : 'bg-[#323038]';
        const borderClass = isFilled ? dotBorderColorClassByTile[clickedTile] : 'border-[#323038]';

        return (
          <span
            key={`seq-dot-${String(idx)}`}
            className={cn(
              'h-[10px] w-[10px] md:h-[14px] md:w-[14px] rounded-full border',
              borderClass,
              fillClass,
              isFilled && 'shadow-[0_0_7px_rgba(247,223,110,0.35)]',
            )}
          />
        );
      })}
    </div>
  );
}
