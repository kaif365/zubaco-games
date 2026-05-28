import { useEffect, useMemo, useState } from 'react';

import { appConfig } from '@/app/config/appConfig';
import type { GameBoard } from '@/types/sliding-puzzle';
import { resolveImageUrl } from '@/utils/imageUrl';
import { STAGE_THEME_COLORS, type StageId } from '@micro-screens/src';

import GameTile from './GameTile';

interface GameBoardProps {
  board: GameBoard;
  pieces: number[];
  disabled?: boolean;
  isSolved?: boolean;
  shuffleMode?: boolean;
  /** When true, all tiles animate to the exact visual center of the grid. */
  gatherToCenter?: boolean;
  /** When true, the blank tile renders its image fragment (pre-scatter phase). */
  showBlankImage?: boolean;
  /**
   * When true, a single full-image overlay covers the tile grid (memorize phase).
   * When it flips to false the overlay fades out, revealing the tiled grid.
   */
  revealMode?: boolean;
  onTileClick: (slot: number) => void;
}

/**
 * Renders the sliding-puzzle grid.
 * Sizing is intentionally left to the parent: this component fills
 * 100% of whatever container it is placed in. The parent is responsible
 * for establishing the correct aspect ratio (gridX : gridY).
 */
export default function GameBoard({
  board,
  pieces,
  disabled = false,
  isSolved = false,
  shuffleMode = false,
  gatherToCenter,
  showBlankImage = false,
  revealMode = false,
  onTileClick,
}: Readonly<GameBoardProps>) {
  const { gridSize, fullImageUrl, enableNumbers = true } = board;
  const gridX = gridSize.x;
  const gridY = gridSize.y;
  const stageNo = appConfig.game.stageNo as StageId;
  const stageTheme = STAGE_THEME_COLORS[stageNo];

  const resolvedUrl = resolveImageUrl(fullImageUrl);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    const img = new window.Image();
    const onLoad = () => { setImageLoaded(true); };
    const onError = () => { setImageLoaded(true); }; // fail gracefully — show tiles anyway
    img.addEventListener('load', onLoad);
    img.addEventListener('error', onError);
    img.src = resolvedUrl;
    if (img.complete) setImageLoaded(true);
    return () => {
      img.removeEventListener('load', onLoad);
      img.removeEventListener('error', onError);
    };
  }, [resolvedUrl]);

  const gridKeys = useMemo(
    () => Array.from({ length: gridX * gridY }, (_, i) => `grid-cell-${String(i)}`),
    [gridX, gridY],
  );

  /*
   * Stable DOM order: always render tile 0…(n-2) then the blank (-1).
   * This prevents React from moving DOM elements when the `pieces` array
   * reorders during scatter — DOM moves + transform changes in the same
   * render cause the browser to skip the CSS transition ("snap" effect).
   * With a stable order, only `positionSlot` changes → transitions fire.
   */
  const stableOrder = useMemo(
    () => [...Array.from({ length: gridX * gridY - 1 }, (_, i) => i), -1],
    [gridX, gridY],
  );

  // Maps pieceIndex → current slot in the pieces array
  const slotMap = useMemo(() => {
    const map = new Map<number, number>();
    pieces.forEach((pieceIndex, slot) => { map.set(pieceIndex, slot); });
    return map;
  }, [pieces]);

  return (
    /* Fill whatever dimensions the parent provides */
    <div className="w-full h-full">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[calc(100%_+_10%)] w-[calc(100%_+_10%)] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[50px] lg:blur-[100px]"
        style={{ backgroundColor: `${stageTheme.eclipse}26` }}
      />
      <div className="relative overflow-hidden rounded-[4px] w-full h-full">
        {/* Subtle grid ghost lines — hidden during memorize */}
        <div className="absolute inset-0 rounded-[4px] border-0" />
        <div
          className="absolute inset-0 grid gap-0.5"
          style={{
            gridTemplateColumns: `repeat(${String(gridX)}, minmax(0, 1fr))`,
            opacity: revealMode ? 0 : 0.15,
            transition: 'opacity 0.6s ease',
          }}
        >
          {gridKeys.map((key) => (
            <div key={key} className="border border-white/5" />
          ))}
        </div>

        {/* Shimmer skeleton — shown while the board image is loading */}
        {!imageLoaded && (
          <div
            className="absolute inset-0 grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${String(gridX)}, 1fr)` }}
          >
            {gridKeys.map((key) => (
              <div key={key} className="puzzle-shimmer-cell" />
            ))}
          </div>
        )}

        {/* Tiles — rendered in stable pieceIndex order so DOM nodes never move */}
        {imageLoaded && stableOrder.map((pieceIndex) => {
          const slot = slotMap.get(pieceIndex) ?? 0;
          return (
            <GameTile
              key={pieceIndex === -1 ? 'blank' : pieceIndex}
              pieceIndex={pieceIndex}
              positionSlot={slot}
              gatherToCenter={gatherToCenter}
              gridX={gridX}
              gridY={gridY}
              fullImageUrl={fullImageUrl}
              enableNumbers={enableNumbers}
              disabled={disabled}
              isSolved={isSolved}
              shuffleMode={shuffleMode}
              showBlankImage={showBlankImage}
              onClick={onTileClick}
            />
          );
        })}

        {/*
         * Full-image memorize overlay — a single div with no tile seams.
         * Visible (opacity 1) during the memorize phase, then fades out
         * over 0.6 s so the tiled grid is gradually revealed underneath.
         */}
        {imageLoaded && (
          <div
            className="absolute inset-0 z-[10] rounded-[4px] pointer-events-none"
            style={{
              backgroundImage: `url(${resolvedUrl})`,
              backgroundSize: '100% 100%',
              opacity: revealMode ? 1 : 0,
              transition: 'opacity 0.6s ease',
            }}
          />
        )}
      </div>
    </div>
  );
}
