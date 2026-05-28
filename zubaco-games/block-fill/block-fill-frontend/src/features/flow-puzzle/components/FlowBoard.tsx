import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { coordKey, findNodeByColor, isCellEnabled } from '@/features/flow-puzzle/engine/flowEngine';
import { buildSmoothSvgPath, getEndpointMap } from '@/features/flow-puzzle/utils/pathRendering';
import type { FlowPuzzleLevel, FlowSessionState, GridCoord } from '@/features/flow-puzzle/types';
import { getLevelCols, getLevelRows } from '@/features/flow-puzzle/utils/levelGrid';

interface FlowBoardProps {
  level: FlowPuzzleLevel;
  session: FlowSessionState;
  disabled?: boolean;
  onBeginPath: (coord: GridCoord) => void;
  onDragPath: (coord: GridCoord) => void;
  onEndPath: () => void;
}

function getCoordFromPointer(
  container: HTMLDivElement | null,
  level: FlowPuzzleLevel,
  clientX: number,
  clientY: number,
) {
  if (!container) {
    return null;
  }

  const rect = container.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
    return null;
  }

  const rows = getLevelRows(level);
  const cols = getLevelCols(level);
  const cellWidth = rect.width / cols;
  const cellHeight = rect.height / rows;
  return {
    row: Math.max(0, Math.min(rows - 1, Math.floor(y / cellHeight))),
    col: Math.max(0, Math.min(cols - 1, Math.floor(x / cellWidth))),
  };
}

export function FlowBoard({
  level,
  session,
  disabled = false,
  onBeginPath,
  onDragPath,
  onEndPath,
}: FlowBoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [activePointerId, setActivePointerId] = useState<number | null>(null);
  const [lastCoordKey, setLastCoordKey] = useState<string | null>(null);

  const endpointMap = getEndpointMap(level);
  const rows = getLevelRows(level);
  const cols = getLevelCols(level);
  const cellSizePercentX = 100 / cols;
  const cellSizePercentY = 100 / rows;
  const svgCellSize = 400 / Math.max(rows, cols);

  return (
    <div
      className={cn(
        'relative w-full max-w-[min(84vw,34rem)] overflow-hidden rounded-[2rem] border border-[rgba(201,184,166,0.14)] bg-[#1c1b20]/88 shadow-[0_0_0_1px_rgba(20,16,12,0.35)_inset,0_30px_80px_rgba(8,6,4,0.5)]',
        disabled && 'opacity-95',
      )}
      style={{ aspectRatio: `${cols}/${rows}` }}
    >
      <div
        ref={boardRef}
        className="relative h-full w-full touch-none"
        style={{
          background: `linear-gradient(145deg, ${level.theme.boardGradient[0]}, ${level.theme.boardGradient[1]})`,
        }}
        onPointerDown={(event) => {
          if (disabled) {
            return;
          }

          const coord = getCoordFromPointer(boardRef.current, level, event.clientX, event.clientY);
          if (!coord) {
            return;
          }

          boardRef.current?.setPointerCapture(event.pointerId);
          setActivePointerId(event.pointerId);
          const nextKey = coordKey(coord);
          setLastCoordKey(nextKey);
          onBeginPath(coord);
        }}
        onPointerMove={(event) => {
          if (disabled || activePointerId !== event.pointerId) {
            return;
          }

          const coord = getCoordFromPointer(boardRef.current, level, event.clientX, event.clientY);
          if (!coord) {
            return;
          }

          const nextKey = coordKey(coord);
          if (nextKey === lastCoordKey) {
            return;
          }

          setLastCoordKey(nextKey);
          onDragPath(coord);
        }}
        onPointerUp={(event) => {
          if (activePointerId !== event.pointerId) {
            return;
          }

          boardRef.current?.releasePointerCapture(event.pointerId);
          setActivePointerId(null);
          setLastCoordKey(null);
          onEndPath();
        }}
        onPointerCancel={() => {
          setActivePointerId(null);
          setLastCoordKey(null);
          onEndPath();
        }}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 400 400">
          <defs>
            {level.nodes.map((node) => (
              <filter id={`glow-${node.colorId}`} key={node.colorId}>
                <feDropShadow
                  dx="0"
                  dy="0"
                  stdDeviation="6"
                  floodColor={node.glowHex ?? node.colorHex}
                />
              </filter>
            ))}
          </defs>
          {level.nodes.map((node) => {
            const path = session.paths[node.colorId] ?? [];
            if (path.length === 0) {
              return null;
            }

            const d = buildSmoothSvgPath(path, svgCellSize);
            const strokeWidth = Math.max(18, 96 / Math.max(rows, cols));

            return (
              <g key={node.colorId}>
                <path
                  d={d}
                  fill="none"
                  stroke={node.colorHex}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={strokeWidth}
                  filter={`url(#glow-${node.colorId})`}
                  opacity={0.98}
                />
                <path
                  d={d}
                  fill="none"
                  stroke={node.glowHex ?? node.colorHex}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={Math.max(5, strokeWidth * 0.24)}
                  opacity={0.65}
                />
              </g>
            );
          })}
        </svg>

        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: rows * cols }, (_, index) => {
            const row = Math.floor(index / cols);
            const col = index % cols;
            const coord = { row, col };
            const key = coordKey(coord);
            const enabled = isCellEnabled(level, coord);
            const endpointColorId = endpointMap.get(key);
            const node = endpointColorId ? findNodeByColor(level, endpointColorId) : null;

            return (
              <div
                key={key}
                className={cn(
                  'relative border border-[rgba(201,184,166,0.1)] transition-colors',
                  enabled ? 'bg-[rgba(232,220,196,0.06)]' : 'bg-[#2f2822]/92',
                )}
              >
                <div className="absolute inset-[10%] rounded-[0.85rem] bg-[rgba(181,160,144,0.04)] shadow-[0_0_0_1px_rgba(20,16,12,0.2)_inset]" />
                {node ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div
                      className="relative h-[58%] w-[58%] rounded-full border border-white/60"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.96), ${node.colorHex} 45%, ${node.glowHex ?? node.colorHex} 100%)`,
                        boxShadow: `0 0 0 3px rgba(255,255,255,0.08), 0 0 24px ${node.glowHex ?? node.colorHex}`,
                      }}
                    >
                      <div className="absolute inset-[14%] rounded-full border border-white/40 bg-white/10" />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: `${cellSizePercentX}% ${cellSizePercentY}%`,
            mixBlendMode: 'screen',
          }}
        />
      </div>
    </div>
  );
}
