import { appConfig } from '@/app/config/appConfig';
import { EMPTY_TILE_SENTINEL } from '@/lib/sliding-puzzle/board';
import { cn } from '@/lib/utils';
import { resolveImageUrl } from '@/utils/imageUrl';
import { STAGE_THEME_COLORS, type StageId } from '@micro-screens/src';

function bgPercent(coord: number, total: number): number {
  return total > 1 ? (coord / (total - 1)) * 100 : 0;
}

function makeTileClickHandler(
  isEmpty: boolean,
  disabled: boolean,
  slot: number,
  onClick: (slot: number) => void,
): () => void {
  return () => {
    if (!isEmpty && !disabled) onClick(slot);
  };
}

interface GameTileProps {
  pieceIndex: number;
  positionSlot: number;
  gridX: number;
  gridY: number;
  gatherToCenter?: boolean;
  fullImageUrl: string;
  enableNumbers?: boolean;
  disabled?: boolean;
  isSolved?: boolean;
  shuffleMode?: boolean;
  showBlankImage?: boolean;
  onClick: (slot: number) => void;
}

export default function GameTile({
  pieceIndex,
  positionSlot,
  gridX,
  gridY,
  fullImageUrl,
  enableNumbers = true,
  disabled = false,
  isSolved = false,
  shuffleMode = false,
  gatherToCenter = false,
  showBlankImage = false,
  onClick,
}: Readonly<GameTileProps>) {
  const isEmpty = pieceIndex === EMPTY_TILE_SENTINEL;
  const blankShowingImage = isEmpty && showBlankImage;
  const row = gatherToCenter ? (gridY - 1) / 2 : Math.floor(positionSlot / gridX);
  const column = gatherToCenter ? (gridX - 1) / 2 : positionSlot % gridX;

  let pieceCol = isEmpty ? 0 : pieceIndex % gridX;
  let pieceRow = isEmpty ? 0 : Math.floor(pieceIndex / gridX);
  if (blankShowingImage) { pieceCol = gridX - 1; pieceRow = gridY - 1; }
  const bgX = bgPercent(pieceCol, gridX);
  const bgY = bgPercent(pieceRow, gridY);

  const stageNo = appConfig.game.stageNo as StageId;
  const stageTheme = STAGE_THEME_COLORS[stageNo];
  const resolvedImage = resolveImageUrl(fullImageUrl);

  const isVisuallyEmpty = isEmpty && !blankShowingImage;
  const showTileImage = !isEmpty || blankShowingImage;
  const innerStyle = isVisuallyEmpty
    ? { backgroundColor: `${stageTheme.background}14`, borderColor: `${stageTheme.resultAccent}26` }
    : undefined;

  return (
    <button
      type="button"
      data-testid={isEmpty ? 'tile-empty' : `tile-${String(pieceIndex)}`}
      onClick={makeTileClickHandler(isEmpty, disabled, positionSlot, onClick)}
      disabled={disabled || (isEmpty && !isSolved)}
      className={cn(
        'absolute group p-[1px] z-[9]',
        'puzzle-tile',
        shuffleMode && 'puzzle-tile--shuffle',
        isEmpty && !isSolved && 'opacity-100 pointer-events-none z-0',
        isEmpty && isSolved && 'opacity-100',
      )}
      style={{
        width: `${String(100 / gridX)}%`,
        height: `${String(100 / gridY)}%`,
        transform: `translate3d(${String(column * 100)}%, ${String(row * 100)}%, 0)`,
      }}
    >
      <span
        className={`relative rounded-[8px] overflow-hidden border ${isVisuallyEmpty ? '' : 'border-[#FDD859]'} block h-full w-full overflow-hidden transition-all`}
        style={innerStyle}
      >
        {showTileImage && (
          <span
            className="block h-full w-full opacity-90 transition-opacity group-hover:opacity-100 shadow-[inset_0_0_5px_#fdd859d1]"
            style={{
              backgroundImage: `url(${resolvedImage})`,
              backgroundSize: `${String(gridX * 100)}% ${String(gridY * 100)}%`,
              backgroundPosition: `${String(bgX)}% ${String(bgY)}%`,
            }}
          />
        )}
        {!isEmpty && enableNumbers && (
          <span className="absolute left-1.5 top-1.5 inline-flex w-5 h-5 items-center justify-center rounded-[4px] bg-[#19152D80] backdrop-blur-md border border-[0.5px] border-[#363c6580] px-1 text-[9px] lg:text-[12px] text-white">
            {pieceIndex + 1}
          </span>
        )}
        {blankShowingImage && !gatherToCenter && enableNumbers && (
          <span className="absolute left-1.5 top-1.5 inline-flex w-5 h-5 items-center justify-center rounded-[4px] bg-[#19152D80] backdrop-blur-md border border-[0.5px] border-[#363c6580] px-1 text-[9px] lg:text-[12px] text-white">
            {gridX * gridY}
          </span>
        )}
      </span>
    </button>
  );
}
