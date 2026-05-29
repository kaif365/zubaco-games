import { useRef } from 'react';
import type { BlockType } from '@/types/logic-reflector';
import { cn } from '@/lib/utils';

const BLOCK_META: Record<BlockType, { label: string; hint: string; icon: React.ReactNode }> = {
  'reflect-block': {
    label: 'Block',
    hint: 'Reflective block',
    icon: (
      <svg viewBox="0 0 36 36" className="w-7 h-7">
        <defs>
          <radialGradient id="reflect-block-grad" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
            <stop offset="38%" stopColor="rgba(95,95,105,0.95)" />
            <stop offset="100%" stopColor="rgba(12,12,18,1)" />
          </radialGradient>
        </defs>
        <rect x="5" y="5" width="26" height="26" rx="4" fill="url(#reflect-block-grad)" />
      </svg>
    ),
  },
  'mirror-fwd': {
    label: '/',
    hint: 'Mirror /',
    icon: (
      <svg viewBox="0 0 36 36" className="w-6 h-6">
        <line x1="7" y1="29" x2="29" y2="7" stroke="rgba(180,160,255,0.9)" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    ),
  },
  'mirror-bwd': {
    label: '\\',
    hint: 'Mirror \\',
    icon: (
      <svg viewBox="0 0 36 36" className="w-6 h-6">
        <line x1="7" y1="7" x2="29" y2="29" stroke="rgba(180,160,255,0.9)" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    ),
  },
  splitter: {
    label: '+',
    hint: 'Splitter',
    icon: (
      <svg viewBox="0 0 36 36" className="w-6 h-6">
        <line x1="18" y1="4" x2="18" y2="32" stroke="rgba(100,230,180,0.9)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="4" y1="18" x2="32" y2="18" stroke="rgba(100,230,180,0.9)" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="18" cy="18" r="2.5" fill="rgba(100,230,180,0.9)" />
      </svg>
    ),
  },
  blocker: {
    label: '■',
    hint: 'Blocker',
    icon: (
      <svg viewBox="0 0 36 36" className="w-6 h-6">
        <rect x="7" y="7" width="22" height="22" rx="4" fill="rgba(220,70,70,0.85)" />
      </svg>
    ),
  },
};

interface ToolbarButtonProps {
  type: BlockType;
  remaining: number;
  isActive: boolean;
  onSelect: (type: BlockType | null) => void;
  onBlockDragMove?: (blockType: BlockType, x: number, y: number) => void;
  onBlockDragEnd?: (blockType: BlockType, x: number, y: number) => void;
  onBlockDragCancel?: () => void;
}

function ToolbarButton({
  type,
  remaining,
  isActive,
  onSelect,
  onBlockDragMove,
  onBlockDragEnd,
  onBlockDragCancel,
}: ToolbarButtonProps) {
  const meta = BLOCK_META[type];
  const depleted = remaining <= 0;
  const pointerDragRef = useRef<{ pointerId: number; startX: number; startY: number; moved: boolean } | null>(null);
  const justDraggedRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (remaining <= 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerDragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = pointerDragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 8) {
      d.moved = true;
      onBlockDragMove?.(type, e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = pointerDragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (d.moved) {
      justDraggedRef.current = true;
      onBlockDragEnd?.(type, e.clientX, e.clientY);
    }
    pointerDragRef.current = null;
  };

  const handlePointerCancel = () => {
    if (pointerDragRef.current?.moved) {
      onBlockDragCancel?.();
    }
    pointerDragRef.current = null;
  };

  const handleClick = () => {
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }
    onSelect(isActive ? null : type);
  };

  return (
    <button
      type="button"
      disabled={depleted}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
      title={`${meta.hint} (${remaining} left)`}
      className={cn(
        'relative flex flex-col items-center justify-center gap-0.5',
        'w-14 h-14 rounded-xl transition-all duration-150',
        isActive
          ? 'ring-2 ring-primary scale-105'
          : depleted
            ? 'opacity-35 cursor-not-allowed'
            : 'cursor-pointer hover:scale-105',
      )}
      style={{
        background: isActive
          ? 'radial-gradient(circle at 35% 35%, rgba(80,80,110,0.95), rgba(25,25,45,0.98))'
          : 'radial-gradient(circle at 35% 35%, rgba(60,60,85,0.9), rgba(20,20,38,0.95))',
        boxShadow: isActive
          ? '0 0 12px rgba(0,220,255,0.4), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.5)'
          : 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.4)',
        border: isActive ? '1px solid rgba(0,220,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
        touchAction: 'none',
      }}
    >
      {meta.icon}
      {/* Count badge */}
      <span
        className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold px-1"
        style={{
          background: remaining > 0 ? 'rgba(0,220,255,0.9)' : 'rgba(80,80,100,0.8)',
          color: remaining > 0 ? '#0a0a1c' : '#666',
        }}
      >
        {remaining}
      </span>
    </button>
  );
}

interface Props {
  availableBlocks: { type: BlockType; count: number }[];
  blockCounts: Record<BlockType, number>;
  selected: BlockType | null;
  onSelect: (type: BlockType | null) => void;
  onBlockDragMove?: (blockType: BlockType, x: number, y: number) => void;
  onBlockDragEnd?: (blockType: BlockType, x: number, y: number) => void;
  onBlockDragCancel?: () => void;
}

export function Toolbar({ availableBlocks, blockCounts, selected, onSelect, onBlockDragMove, onBlockDragEnd, onBlockDragCancel }: Props) {
  const visible = availableBlocks.filter(({ count }) => count > 0);
  if (visible.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-3 px-4">
      {visible.map(({ type }) => {
        const remaining = blockCounts[type] ?? 0;
        const isActive = selected === type;

        return (
          <ToolbarButton
            key={type}
            type={type}
            remaining={remaining}
            isActive={isActive}
            onSelect={onSelect}
            onBlockDragMove={onBlockDragMove}
            onBlockDragEnd={onBlockDragEnd}
            onBlockDragCancel={onBlockDragCancel}
          />
        );
      })}

      {/* Deselect hint */}
      {selected && (
        <button
          type="button"
          onClick={() => { onSelect(null); }}
          className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground ml-1 transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  );
}
