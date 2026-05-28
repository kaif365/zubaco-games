import { useMemo, useRef, useState, useEffect, useCallback, type CSSProperties } from 'react';
import type { BlockType, CellType, GameLevel, PlacedBlock, ServerCell } from '@/types/logic-reflector';
import { pointForCell, simulateLaser, targetKey } from '@/game/laserEngine';
import type { BeamArm } from '@/game/laserEngine';
import { cn } from '@/lib/utils';
import { EmitterIcon, GameCell, TargetIcon, type BoardTransitionState } from './GameCell';
import { LaserBeam } from './LaserBeam';

interface Props {
  level: GameLevel;
  placedBlocks: PlacedBlock[];
  litTargetKeys: Set<string>;
  selectedBlock: BlockType | null;
  disabled: boolean;
  transitionState?: BoardTransitionState;
  onCellClick: (row: number, col: number) => void;
  onCellRemove: (row: number, col: number) => void;
  onCellDrop: (toRow: number, toCol: number, blockType: BlockType, fromRow: number, fromCol: number) => void;
}

interface DragState {
  blockType: BlockType;
  fromRow: number;
  fromCol: number;
  currentX: number;
  currentY: number;
}

const MIN_CELL = 48;
const MAX_CELL = 80;

export function GameBoard({
  level,
  placedBlocks,
  litTargetKeys,
  selectedBlock,
  disabled,
  transitionState = 'idle',
  onCellClick,
  onCellRemove,
  onCellDrop,
}: Props) {
  const { x: cols, y: rows } = level.gridSize;
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(64);

  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ row: number; col: number } | null>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      const byW = Math.floor((el.clientWidth - 32) / cols);
      const byH = Math.floor((el.clientHeight - 32) / rows);
      setCellSize(Math.max(MIN_CELL, Math.min(MAX_CELL, Math.min(byW, byH))));
    });
    obs.observe(el);
    return () => { obs.disconnect(); };
  }, [rows, cols]);

  const fixedCellMap = useMemo(() => {
    const map = new Map<string, ServerCell>();
    for (const c of level.cells) {
      if (c.type === 'target' && c.locksPlacement !== true) continue;
      map.set(`${c.row},${c.col}`, c);
    }
    return map;
  }, [level.cells]);

  const fixedDisplayMap = useMemo(() => {
    const map = new Map<string, ServerCell>();
    for (const c of level.cells) {
      const hasCustomPoint = typeof c.x === 'number' || typeof c.y === 'number';
      if (c.type === 'target') continue;
      if (c.type === 'emitter' && hasCustomPoint) continue;
      map.set(`${c.row},${c.col}`, c);
    }
    return map;
  }, [level.cells]);

  const targets = useMemo(
    () => level.cells.filter((cell) => cell.type === 'target'),
    [level.cells],
  );

  const floatingEmitters = useMemo(
    () => level.cells.filter(
      (cell) => cell.type === 'emitter' && (typeof cell.x === 'number' || typeof cell.y === 'number'),
    ),
    [level.cells],
  );

  const placedMap = useMemo(() => {
    const map = new Map<string, BlockType>();
    for (const b of placedBlocks) map.set(`${b.row},${b.col}`, b.type);
    return map;
  }, [placedBlocks]);

  const beamArms = useMemo((): BeamArm[] => {
    return simulateLaser(level, placedBlocks).arms;
  }, [level, placedBlocks]);

  const getCellFromPoint = useCallback((clientX: number, clientY: number): { row: number; col: number } | null => {
    const el = gridRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;
    if (relX < 0 || relY < 0 || relX > rect.width || relY > rect.height) return null;
    const col = Math.floor(relX / (cellSize + 1));
    const row = Math.floor(relY / (cellSize + 1));
    if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
    return { row, col };
  }, [cellSize, cols, rows]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const target = (e.target as HTMLElement).closest('[data-placed-block="true"]') as HTMLElement | null;
    if (!target) return;
    const rowStr = target.dataset.row;
    const colStr = target.dataset.col;
    if (rowStr === undefined || colStr === undefined) return;
    const fromRow = parseInt(rowStr);
    const fromCol = parseInt(colStr);
    const blockType = placedMap.get(`${fromRow},${fromCol}`);
    if (!blockType) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const newDrag: DragState = {
      blockType,
      fromRow,
      fromCol,
      currentX: e.clientX,
      currentY: e.clientY,
    };
    dragRef.current = newDrag;
    setDrag(newDrag);
  }, [disabled, placedMap]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const updated: DragState = {
      ...dragRef.current,
      currentX: e.clientX,
      currentY: e.clientY,
    };
    dragRef.current = updated;
    setDrag(updated);

    const cell = getCellFromPoint(e.clientX, e.clientY);
    if (cell && (cell.row !== dragRef.current.fromRow || cell.col !== dragRef.current.fromCol)) {
      setDragOverCell(cell);
    } else {
      setDragOverCell(null);
    }
  }, [getCellFromPoint]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const { blockType, fromRow, fromCol } = dragRef.current;
    const cell = getCellFromPoint(e.clientX, e.clientY);
    if (cell && (cell.row !== fromRow || cell.col !== fromCol)) {
      onCellDrop(cell.row, cell.col, blockType, fromRow, fromCol);
    }
    dragRef.current = null;
    setDrag(null);
    setDragOverCell(null);
  }, [getCellFromPoint, onCellDrop]);

  const handlePointerCancel = useCallback(() => {
    dragRef.current = null;
    setDrag(null);
    setDragOverCell(null);
  }, []);

  const boardW = cols * cellSize;
  const boardH = rows * cellSize;
  const totalCells = rows * cols;
  const cellStaggerMs = Math.max(8, Math.min(22, Math.floor(680 / Math.max(1, totalCells - 1))));
  const layerDelayMs = Math.min(760, Math.max(120, (totalCells - 1) * cellStaggerMs + 80));
  const transitionVars = {
    '--lr-layer-delay': `${transitionState === 'opening' ? layerDelayMs : 0}ms`,
  } as CSSProperties;

  return (
    <div ref={containerRef} className="flex items-center justify-center w-full h-full">
      {/* Outer frame */}
      <div
        className={cn(
          'lr-board-frame',
          transitionState !== 'idle' && `lr-board-frame--${transitionState}`,
        )}
        style={{
          padding: '2px',
          background: 'rgba(255,255,255,0.07)',
          borderRadius: '10px',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.5)',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* Grid container — relative so SVG overlay can be absolute */}
        <div
          className={cn(
            'lr-board-grid relative overflow-visible rounded-lg',
            transitionState !== 'idle' && `lr-board-grid--${transitionState}`,
          )}
          style={{
            width: boardW,
            height: boardH,
            // Diamond/crosshatch texture like the reference
            background:
              'repeating-conic-gradient(rgba(255,255,255,0.025) 0% 25%, rgba(0,0,0,0) 0% 50%) 0 0 / 20px 20px, #1a1a28',
          }}
        >
          {/* Grid cells */}
          <div
            ref={gridRef}
            className="absolute inset-0 grid"
            style={{
              gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
              gap: '1px',
            }}
          >
            {Array.from({ length: rows }, (_, r) =>
              Array.from({ length: cols }, (_, c) => {
                const key = `${r},${c}`;
                const transitionOrder = r * cols + c;
                const fixed = fixedCellMap.get(key);
                const displayFixed = fixedDisplayMap.get(key);
                const placed = placedMap.get(key);
                const cellType: CellType | null = displayFixed?.type ?? placed ?? null;
                const isLit = displayFixed?.type === 'target' ? litTargetKeys.has(key) : false;
                const isFixed = fixed?.fixed ?? false;

                return (
                  <GameCell
                    key={key}
                    cellType={cellType}
                    direction={displayFixed?.direction}
                    angle={displayFixed?.angle}
                    fixed={isFixed}
                    isLit={isLit}
                    isPlaceable={!isFixed && !placed}
                    selectedBlock={selectedBlock}
                    row={r}
                    col={c}
                    isDragOver={dragOverCell?.row === r && dragOverCell?.col === c}
                    transitionState={transitionState}
                    transitionDelayMs={transitionOrder * cellStaggerMs}
                    onClick={() => { if (!disabled) onCellClick(r, c); }}
                    onRemove={() => { if (!disabled) onCellRemove(r, c); }}
                  />
                );
              })
            )}
          </div>

          {/* Laser beam SVG overlay (overflow visible so beam exits grid) */}
          <div
            className={cn(
              'lr-board-laser-layer absolute inset-0 pointer-events-none',
              transitionState !== 'idle' && `lr-board-laser-layer--${transitionState}`,
            )}
            style={transitionVars}
          >
            <LaserBeam arms={beamArms} cellSize={cellSize} rows={rows} cols={cols} />
          </div>

          <div
            className={cn(
              'lr-board-fixtures-layer absolute inset-0 pointer-events-none z-20',
              transitionState !== 'idle' && `lr-board-fixtures-layer--${transitionState}`,
            )}
            style={transitionVars}
          >
            {floatingEmitters.map((emitter) => {
              const point = pointForCell(emitter);
              return (
                <div
                  key={emitter.id ?? `emitter:${emitter.row},${emitter.col}`}
                  className="absolute"
                  style={{
                    width: cellSize,
                    height: cellSize,
                    left: point.x * cellSize,
                    top: point.y * cellSize,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <EmitterIcon direction={emitter.direction} angle={emitter.angle} />
                </div>
              );
            })}

            {targets.map((target, index) => {
              const point = pointForCell(target);
              const radius = target.radius ?? 0.14;
              const size = Math.max(cellSize * 0.34, radius * cellSize * 3.8);
              return (
                <div
                  key={targetKey(target, index)}
                  className="absolute flex items-center justify-center"
                  style={{
                    width: size,
                    height: size,
                    left: point.x * cellSize,
                    top: point.y * cellSize,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <TargetIcon lit={litTargetKeys.has(targetKey(target, index))} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ghost element: keep it outside the animated frame so fixed coordinates stay viewport-based */}
      {drag !== null && (
        <div
          style={{
            position: 'fixed',
            left: drag.currentX,
            top: drag.currentY,
            width: cellSize - 6,
            height: cellSize - 6,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 9999,
            background: 'radial-gradient(circle at 35% 35%, rgba(80,80,100,0.95), rgba(20,20,35,0.98))',
            border: '1px solid rgba(160,140,255,0.55)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            borderRadius: 8,
            opacity: 0.85,
          }}
        />
      )}
    </div>
  );
}
