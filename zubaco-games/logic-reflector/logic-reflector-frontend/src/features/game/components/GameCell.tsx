import type { CSSProperties } from 'react';
import type { BlockType, CellType, Direction } from '@/types/logic-reflector';
import { angleForDirection } from '@/game/laserEngine';
import { cn } from '@/lib/utils';

export type BoardTransitionState = 'idle' | 'opening' | 'closing' | 'solved';

interface Props {
  cellType: CellType | null;
  direction?: Direction;
  angle?: number;
  fixed: boolean;
  isLit: boolean;
  isPlaceable: boolean;
  selectedBlock: BlockType | null;
  row: number;
  col: number;
  isDragOver?: boolean;
  transitionState?: BoardTransitionState;
  transitionDelayMs?: number;
  onClick: () => void;
  onRemove: () => void;
}

// ── Emitter ───────────────────────────────────────────────────────────────────
export function EmitterIcon({ direction, angle }: { direction?: Direction; angle?: number }) {
  const rotate = angleForDirection(direction, angle) + 90;
  return (
    <svg viewBox="0 0 40 40" className="w-full h-full absolute inset-0">
      {/* Outer glow ring */}
      <circle cx="20" cy="20" r="14" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      {/* Core white orb */}
      <circle cx="20" cy="20" r="7" fill="white" opacity="0.95" />
      <circle cx="20" cy="20" r="10" fill="white" opacity="0.15" />
      <circle cx="20" cy="20" r="13" fill="white" opacity="0.06" />
      {/* Direction tick */}
      <line
        x1="20" y1="7" x2="20" y2="1"
        stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round"
        style={{ transformOrigin: '20px 20px', transform: `rotate(${rotate}deg)` }}
      />
    </svg>
  );
}

// ── Target ────────────────────────────────────────────────────────────────────
export function TargetIcon({ lit }: { lit: boolean }) {
  const c = lit ? '#ffd700' : 'rgba(180,180,200,0.7)';
  const glow = lit ? 'drop-shadow(0 0 6px #ffd700)' : undefined;
  return (
    <svg viewBox="0 0 40 40" className="w-3/5 h-3/5" style={{ filter: glow }}>
      <circle cx="20" cy="20" r="16" fill="none" stroke={c} strokeWidth="1.8" />
      <circle cx="20" cy="20" r="10" fill="none" stroke={c} strokeWidth="1.4" />
      <circle cx="20" cy="20" r="4" fill={c} />
    </svg>
  );
}

// ── Mirror icons (rendered inside the dark block tile) ────────────────────────
function MirrorLine({ fwd }: { fwd: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className="w-4/5 h-4/5 absolute inset-0 m-auto">
      {fwd
        ? <line x1="8" y1="32" x2="32" y2="8" stroke="rgba(180,180,255,0.85)" strokeWidth="3" strokeLinecap="round" />
        : <line x1="8" y1="8" x2="32" y2="32" stroke="rgba(180,180,255,0.85)" strokeWidth="3" strokeLinecap="round" />
      }
    </svg>
  );
}

function SplitterLines() {
  return (
    <svg viewBox="0 0 40 40" className="w-4/5 h-4/5 absolute inset-0 m-auto">
      <line x1="20" y1="4" x2="20" y2="36" stroke="rgba(100,230,180,0.85)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="4" y1="20" x2="36" y2="20" stroke="rgba(100,230,180,0.85)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function ReflectBlockSheen() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(circle at 50% 48%, rgba(255,255,255,0.42), rgba(255,255,255,0.11) 28%, rgba(0,0,0,0) 56%)',
      }}
    />
  );
}

// ── Block tile (dark raised square for mirrors, splitters, blockers) ───────────
function BlockTile({
  children,
  isLit,
  canRemove,
}: {
  children?: React.ReactNode;
  isLit?: boolean;
  canRemove?: boolean;
}) {
  return (
    <div
      className={cn(
        'absolute inset-[3px] rounded-lg flex items-center justify-center overflow-hidden',
        'transition-all duration-150 pointer-events-none',
      )}
      style={{
        background: isLit
          ? 'radial-gradient(circle at center, rgba(0,200,255,0.18), rgba(20,20,35,0.92))'
          : 'radial-gradient(circle at 35% 35%, rgba(80,80,100,0.9), rgba(20,20,35,0.95))',
        boxShadow: isLit
          ? '0 0 10px rgba(0,200,255,0.3), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.4)'
          : 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4)',
        border: canRemove ? '1px solid rgba(160,140,255,0.4)' : '1px solid rgba(80,80,100,0.5)',
      }}
    >
      {children}
    </div>
  );
}

// ── Main cell ─────────────────────────────────────────────────────────────────
export function GameCell({
  cellType,
  direction,
  angle,
  fixed,
  isLit,
  isPlaceable,
  selectedBlock,
  row,
  col,
  isDragOver,
  transitionState = 'idle',
  transitionDelayMs = 0,
  onClick,
  onRemove,
}: Props) {
  const isEmpty = !cellType || cellType === 'empty';
  const isPlacedBlock = !fixed && !isEmpty && cellType !== 'emitter' && cellType !== 'target';
  const canPlace = isEmpty && isPlaceable && !!selectedBlock;

  return (
    <div
      className={cn(
        'relative flex items-center justify-center',
        'rounded-md transition-all duration-100',
        'lr-grid-cell',
        (canPlace || isDragOver) && 'cursor-pointer',
        isPlacedBlock && 'cursor-grab active:cursor-grabbing',
        transitionState !== 'idle' && `lr-grid-cell--${transitionState}`,
      )}
      style={{
        '--cell-delay': `${transitionDelayMs}ms`,
        background: isEmpty
          ? isDragOver || canPlace
            ? 'rgba(0,220,255,0.08)'
            : 'rgba(255,255,255,0.025)'
          : 'transparent',
        border: isEmpty
          ? isDragOver
            ? '1px solid rgba(0,220,255,0.55)'
            : canPlace
              ? '1px solid rgba(0,220,255,0.25)'
              : '1px solid rgba(255,255,255,0.06)'
          : 'none',
        boxShadow: isEmpty && !canPlace && !isDragOver ? 'inset 0 0 0 1px rgba(255,255,255,0.03)' : undefined,
        touchAction: isPlacedBlock ? 'none' : undefined,
      } as CSSProperties}
      data-row={row}
      data-col={col}
      data-placed-block={isPlacedBlock ? 'true' : undefined}
      onClick={isEmpty ? onClick : undefined}
      onContextMenu={(e) => { e.preventDefault(); if (isPlacedBlock) onRemove(); }}
      onDoubleClick={() => { if (isPlacedBlock) onRemove(); }}
    >
      {/* Emitter: glowing white dot */}
      {cellType === 'emitter' && <EmitterIcon direction={direction} angle={angle} />}

      {/* Target: bullseye */}
      {cellType === 'target' && <TargetIcon lit={isLit} />}

      {/* Placed / fixed mirrors & blocks */}
      {(cellType === 'reflect-block' || cellType === 'mirror-fwd' || cellType === 'mirror-bwd' || cellType === 'splitter' || cellType === 'blocker') && (
        <BlockTile isLit={isLit} canRemove={isPlacedBlock}>
          {cellType === 'reflect-block' && <ReflectBlockSheen />}
          {cellType === 'mirror-fwd' && <MirrorLine fwd />}
          {cellType === 'mirror-bwd' && <MirrorLine fwd={false} />}
          {cellType === 'splitter' && <SplitterLines />}
          {cellType === 'blocker' && (
            <div className="w-4/5 h-4/5 rounded-md" style={{ background: 'rgba(220,60,60,0.7)' }} />
          )}
        </BlockTile>
      )}

      {/* Hover / drag-over preview for placeable empty cell */}
      {(canPlace || isDragOver) && isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
          <div className="w-1/2 h-1/2 rounded-full border border-primary" />
        </div>
      )}
    </div>
  );
}
