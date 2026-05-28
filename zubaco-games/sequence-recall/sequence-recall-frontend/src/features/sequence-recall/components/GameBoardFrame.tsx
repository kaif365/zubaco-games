import { motion } from 'framer-motion';

import { IMAGES } from '@/assets/images';
import { cn } from '@/lib/utils';

// Tile 1 top-left (blue), 2 top-right (gold), 3 bottom-left (maroon), 4 bottom-right (green)
export const LEAF_ASSET_MAP: Record<number, { idle: string; active: string; wrong: string }> = {
  1: { idle: IMAGES.leafBlue, active: IMAGES.leafBlueActive, wrong: IMAGES.leafBlueWrong },
  2: { idle: IMAGES.leafGold, active: IMAGES.leafGoldActive, wrong: IMAGES.leafGoldWrong },
  3: { idle: IMAGES.leafMaroon, active: IMAGES.leafMaroonActive, wrong: IMAGES.leafMaroonWrong },
  4: { idle: IMAGES.leafGreen, active: IMAGES.leafGreenActive, wrong: IMAGES.leafGreenWrong },
  5: { idle: IMAGES.leafBlue, active: IMAGES.leafBlueActive, wrong: IMAGES.leafBlueWrong },
  6: { idle: IMAGES.leafGold, active: IMAGES.leafGoldActive, wrong: IMAGES.leafGoldWrong },
};

const WRONG_MOVE_LABEL_ICON_FILTER =
  'brightness(0) saturate(100%) invert(33%) sepia(98%) saturate(2559%) hue-rotate(340deg) brightness(101%) contrast(103%)';

type TileLabel = string | { src: string; alt: string; className?: string };

export const DEFAULT_TILE_LABELS: Record<number, TileLabel> = {
  1: { src: IMAGES.buttonIconN, alt: 'N', className: 'mt-[13px]' },
  2: { src: IMAGES.buttonIconP, alt: 'P', className: 'mt-[13px]' },
  3: { src: IMAGES.buttonIconL, alt: 'L', className: 'mb-[13px]' },
  4: { src: IMAGES.buttonIconH, alt: 'H', className: 'mb-[13px]' },
};

/**
 * Gets grid cols.
 *
 * @param {number} count - The count.
 *
 * @returns {string} The result of getGridCols.
 */
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

/**
 * Interactive tile.
 *
 * @param {InteractiveTileProps} props - Component props.
 * @param {number} props.tileId - The tile id.
 * @param {boolean} props.isPlaybackActive - The is playback active.
 * @param {boolean} props.isInputActive - The is input active.
 * @param {boolean} props.isWrong - The is wrong.
 * @param {boolean} props.disabled - The disabled.
 * @param {TileLabel | undefined} [props.label] - The label.
 * @param {(tileId: number) => void} props.onClick - The on click.
 *
 * @returns {JSX.Element} The rendered element.
 */
function InteractiveTile({
  tileId,
  isPlaybackActive,
  isInputActive,
  isWrong,
  disabled,
  label,
  onClick,
}: InteractiveTileProps) {
  const leafAsset = LEAF_ASSET_MAP[tileId] ?? LEAF_ASSET_MAP[((tileId - 1) % 4) + 1];
  const isActive = isPlaybackActive || isInputActive;
  const imageLayerClass =
    'pointer-events-none absolute inset-0 h-full w-full select-none object-contain transition-opacity duration-100';

  return (
    <motion.button
      type="button"
      onClick={() => {
        onClick(tileId);
      }}
      disabled={disabled}
      whileTap={{ scale: 0.96 }}
      className={cn(
        'tile-card relative aspect-square min-h-[126px] overflow-visible transition-all duration-200',
        !disabled && 'hover:-translate-y-[1px]',
        disabled && 'opacity-90',
        isPlaybackActive && 'scale-[1.025]',
        isInputActive && 'scale-[1.02]',
      )}
      aria-label={`Tile ${String(tileId)}`}
    >
      <img
        src={leafAsset.idle}
        alt=""
        draggable={false}
        className={cn(imageLayerClass, !isActive && !isWrong ? 'opacity-100' : 'opacity-0')}
      />
      <img
        src={leafAsset.active}
        alt=""
        draggable={false}
        className={cn(
          imageLayerClass,
          isActive && !isWrong ? 'opacity-100' : 'opacity-0',
          isPlaybackActive && 'drop-shadow-[0_0_7px_rgba(247,223,110,0.42)]',
          isInputActive && 'drop-shadow-[0_0_7px_rgba(255,255,255,0.3)]',
        )}
      />
      <img
        src={leafAsset.wrong}
        alt=""
        draggable={false}
        className={cn(
          imageLayerClass,
          isWrong ? 'opacity-100' : 'opacity-0',
          isWrong && 'drop-shadow-[0_0_18px_rgba(240,69,69,1)]',
        )}
      />
      {label &&
        (typeof label === 'string' ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[42px] font-bold text-amber-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
            {label}
          </span>
        ) : (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <img
              src={label.src}
              alt={label.alt}
              style={isWrong ? { filter: WRONG_MOVE_LABEL_ICON_FILTER } : undefined}
              className={cn(
                'h-10 w-10 object-contain',
                isActive ? 'opacity-100' : 'opacity-60',
                label.className,
              )}
              draggable={false}
            />
          </div>
        ))}
    </motion.button>
  );
}

// ── Decorative variant (lobby) ────────────────────────────────────────────────

interface DecorativeTileProps {
  tileId: number;
  index: number;
  label?: TileLabel;
}

/**
 * Decorative tile.
 *
 * @param {DecorativeTileProps} props - Component props.
 * @param {number} props.tileId - The tile id.
 * @param {number} props.index - The index.
 * @param {TileLabel | undefined} [props.label] - The label.
 *
 * @returns {JSX.Element} The rendered element.
 */
function DecorativeTile({ tileId, index, label }: DecorativeTileProps) {
  const leafAsset = LEAF_ASSET_MAP[tileId] ?? LEAF_ASSET_MAP[((tileId - 1) % 4) + 1];

  return (
    <motion.div
      className="relative aspect-square min-h-[108px]"
      animate={{
        // opacity: [0.7, 1, 0.7],
        filter: [
          'drop-shadow(0 0 0px rgba(247,223,110,0))',
          'drop-shadow(0 0 14px rgba(247,223,110,0.4))',
          'drop-shadow(0 0 0px rgba(247,223,110,0))',
        ],
      }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: index * 0.38 }}
    >
      <img
        src={leafAsset.idle}
        alt=""
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
      />
      {label &&
        (typeof label === 'string' ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[42px] font-bold text-amber-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
            {label}
          </span>
        ) : (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <img
              src={label.src}
              alt={label.alt}
              className={`h-10 w-10 opacity-60 ${label.className ?? ''}`}
              draggable={false}
            />
          </div>
        ))}
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

type GameBoardFrameProps = GameBoardFrameInteractiveProps | GameBoardFrameDecorativeProps;

/**
 * Game board frame.
 *
 * @param {GameBoardFrameInteractiveProps | GameBoardFrameDecorativeProps} props - Component props.
 *
 * @returns {JSX.Element} The rendered element.
 */
export function GameBoardFrame(props: GameBoardFrameProps) {
  const boxCount = props.boxCount ?? 4;
  const tiles = Array.from({ length: boxCount }, (_, i) => i + 1);
  const wrongTileId = props.variant === 'interactive' ? (props.wrongTileId ?? null) : null;

  return (
    <div className="relative mx-auto w-[320px] h-[320px] flex md:h-[400px] md:w-[400px] items-center justify-center main-image-container">
      <img
        src={IMAGES.outerFrame}
        alt=""
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 w-[360px] -translate-x-1/2 -translate-y-1/2 select-none"
        draggable={false}
      />
      <div
        className={cn(
          'relative z-10 grid w-[280px] md:w-[300px] leaf-parent gap-y-[5px] gap-x-[12px]',
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
      <img
        src={IMAGES.innerFrame}
        alt=""
        className="absolute left-1/2 top-1/2 z-20 w-[110px] -translate-x-1/2 -translate-y-1/2 select-none rounded-[90px]"
        draggable={false}
      />
    </div>
  );
}
