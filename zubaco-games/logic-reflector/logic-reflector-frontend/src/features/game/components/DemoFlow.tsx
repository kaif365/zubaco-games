import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { simulateLaser, targetKey } from '@/game/laserEngine';
import type { BlockType, GameLevel, PlacedBlock } from '@/types/logic-reflector';
import { STAGE_THEME_COLORS, type StageId } from '@/micro-screens/theme/colors';
import { createEmptyBlockCounts, getLevelAvailableBlocks } from '../utils/levelBlocks';
import { GameBoard } from './GameBoard';
import { Toolbar } from './Toolbar';
import './game-container.css';

interface DemoFlowProps {
  stage: StageId;
  boards: GameLevel[];
  onComplete: () => void;
}

function rgbString(hex: string): string {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ].join(', ');
}

function buildGameThemeStyle(stage: StageId): CSSProperties {
  const t = STAGE_THEME_COLORS[stage];
  return {
    '--game-bg': t.background,
    '--game-bg-rgb': rgbString(t.background),
    '--game-eclipse': t.eclipse,
    '--game-eclipse-rgb': rgbString(t.eclipse),
    '--game-accent': t.resultAccent,
    '--game-accent-rgb': rgbString(t.resultAccent),
  } as CSSProperties;
}

function demoBlockId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `demo-block-${Date.now()}-${Math.random()}`;
}

function createInitialPlacedBlocks(level: GameLevel): PlacedBlock[] {
  return (level.initialBlocks ?? []).map((block) => ({ ...block, seeded: true }));
}

function computeAvailableCounts(
  level: GameLevel,
  placedBlocks: PlacedBlock[],
): Record<BlockType, number> {
  const counts = createEmptyBlockCounts();
  for (const available of getLevelAvailableBlocks(level)) {
    counts[available.type] = available.count;
  }
  for (const block of placedBlocks) {
    counts[block.type] = Math.max(0, counts[block.type] - 1);
  }
  return counts;
}

function targetKeys(level: GameLevel): string[] {
  return level.cells
    .filter((cell) => cell.type === 'target')
    .map((cell, index) => targetKey(cell, index));
}

export function DemoFlow({ stage, boards, onComplete }: Readonly<DemoFlowProps>) {
  const [levelIndex, setLevelIndex] = useState(0);
  const currentLevel = boards[levelIndex] ?? boards[0];

  const [placedBlocks, setPlacedBlocks] = useState<PlacedBlock[]>(() =>
    currentLevel ? createInitialPlacedBlocks(currentLevel) : [],
  );
  const [selectedBlock, setSelectedBlock] = useState<BlockType | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [toolbarGhost, setToolbarGhost] = useState<{
    blockType: BlockType;
    x: number;
    y: number;
  } | null>(null);

  const levelTargets = useMemo(
    () => (currentLevel ? targetKeys(currentLevel) : []),
    [currentLevel],
  );
  const litTargetKeys = useMemo(
    () =>
      currentLevel ? simulateLaser(currentLevel, placedBlocks).litTargetKeys : new Set<string>(),
    [currentLevel, placedBlocks],
  );
  const availableBlockCounts = useMemo(
    () =>
      currentLevel ? computeAvailableCounts(currentLevel, placedBlocks) : createEmptyBlockCounts(),
    [currentLevel, placedBlocks],
  );
  const availableToolbarBlocks = useMemo(
    () =>
      currentLevel
        ? getLevelAvailableBlocks(currentLevel)
            .map(({ type }) => ({ type, count: availableBlockCounts[type] }))
            .filter(({ count }) => count > 0)
        : [],
    [availableBlockCounts, currentLevel],
  );
  const allTargetsLit =
    levelTargets.length > 0 && levelTargets.every((key) => litTargetKeys.has(key));

  const goToLevel = useCallback(
    (nextIndex: number) => {
      const nextLevel = boards[nextIndex];
      if (!nextLevel) return;
      setLevelIndex(nextIndex);
      setPlacedBlocks(createInitialPlacedBlocks(nextLevel));
      setSelectedBlock(null);
      setSelectedBlockId(null);
    },
    [boards],
  );

  useEffect(() => {
    if (!allTargetsLit) return;
    const timer = setTimeout(() => {
      if (levelIndex >= boards.length - 1) {
        onComplete();
      } else {
        goToLevel(Math.min(levelIndex + 1, boards.length - 1));
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [allTargetsLit, goToLevel, levelIndex, boards.length, onComplete]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!currentLevel || !selectedBlock || allTargetsLit) return;
      const fixedCell = currentLevel.cells.find((cell) => cell.row === row && cell.col === col);
      if (fixedCell) return;
      const alreadyPlaced = placedBlocks.find((block) => block.row === row && block.col === col);
      if (alreadyPlaced || availableBlockCounts[selectedBlock] <= 0) return;

      const placedBlock: PlacedBlock = {
        id: selectedBlockId ?? demoBlockId(),
        row,
        col,
        type: selectedBlock,
        seeded: selectedBlockId !== null,
      };
      setPlacedBlocks((blocks) => [...blocks, placedBlock]);
      if (selectedBlockId) {
        setSelectedBlock(null);
        setSelectedBlockId(null);
      }
    },
    [
      allTargetsLit,
      availableBlockCounts,
      currentLevel,
      placedBlocks,
      selectedBlock,
      selectedBlockId,
    ],
  );

  const handleCellRemove = useCallback(
    (row: number, col: number) => {
      if (allTargetsLit) return;
      const removed = placedBlocks.find((block) => block.row === row && block.col === col);
      if (!removed) return;
      setPlacedBlocks((blocks) =>
        blocks.filter((block) => !(block.row === row && block.col === col)),
      );
      setSelectedBlock(removed.type);
      setSelectedBlockId(removed.id ?? null);
    },
    [allTargetsLit, placedBlocks],
  );

  const handleDrop = useCallback(
    (toRow: number, toCol: number, blockType: BlockType, fromRow: number, fromCol: number) => {
      if (!currentLevel || allTargetsLit) return;
      const fixedCell = currentLevel.cells.find((cell) => cell.row === toRow && cell.col === toCol);
      if (fixedCell) return;

      if (fromRow >= 0 && fromCol >= 0) {
        if (fromRow === toRow && fromCol === toCol) return;
        const source = placedBlocks.find((block) => block.row === fromRow && block.col === fromCol);
        const occupied = placedBlocks.find((block) => block.row === toRow && block.col === toCol);
        if (!source || occupied) return;
        setPlacedBlocks((blocks) => [
          ...blocks.filter((block) => !(block.row === fromRow && block.col === fromCol)),
          { ...source, row: toRow, col: toCol, type: blockType },
        ]);
        setSelectedBlockId(null);
        return;
      }

      const occupied = placedBlocks.find((block) => block.row === toRow && block.col === toCol);
      if (occupied || availableBlockCounts[blockType] <= 0) return;
      setPlacedBlocks((blocks) => [
        ...blocks,
        { id: demoBlockId(), row: toRow, col: toCol, type: blockType },
      ]);
      setSelectedBlockId(null);
    },
    [allTargetsLit, availableBlockCounts, currentLevel, placedBlocks],
  );

  const handleBlockDragMove = useCallback((blockType: BlockType, x: number, y: number) => {
    setToolbarGhost({ blockType, x, y });
  }, []);

  const handleBlockDragEnd = useCallback(
    (blockType: BlockType, x: number, y: number) => {
      setToolbarGhost(null);
      const elements = document.elementsFromPoint(x, y);
      for (const el of elements) {
        const row = (el as HTMLElement).dataset.row;
        const col = (el as HTMLElement).dataset.col;
        if (row !== undefined && col !== undefined) {
          handleDrop(parseInt(row), parseInt(col), blockType, -1, -1);
          break;
        }
      }
    },
    [handleDrop],
  );

  const handleBlockDragCancel = useCallback(() => {
    setToolbarGhost(null);
  }, []);

  const skipRef = useRef(onComplete);
  useEffect(() => {
    skipRef.current = onComplete;
  }, [onComplete]);

  if (!currentLevel) return null;

  const boardTransitionState = allTargetsLit ? 'solved' : 'idle';

  return (
    <main className="lr-game-shell select-none" style={buildGameThemeStyle(stage)}>
      <div className="gradient-layer-top" />

      <div className="h-[100dvh] flex flex-col justify-between py-5">
        <header className="lr-game-header flex-shrink-0 relative flex items-center justify-center">
          <div className="lr-demo-label">
            Demo {levelIndex + 1}/{boards.length}
          </div>
          <button type="button" className="lr-demo-skip" onClick={() => skipRef.current()}>
            Done
          </button>
        </header>

        <div className="lr-playfield relative flex items-center justify-center px-4 py-2">
          <GameBoard
            level={currentLevel}
            placedBlocks={placedBlocks}
            litTargetKeys={litTargetKeys}
            selectedBlock={selectedBlock}
            disabled={allTargetsLit}
            transitionState={boardTransitionState}
            onCellClick={handleCellClick}
            onCellRemove={handleCellRemove}
            onCellDrop={handleDrop}
          />

          <div className="round-progress-dots" aria-label="Demo progress">
            {boards.map((level, index) => (
              <span
                key={level.levelId}
                className={[
                  'round-progress-dot',
                  index < levelIndex ? 'complete' : index === levelIndex ? 'current' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-hidden
              />
            ))}
          </div>
        </div>

        <div className="lr-game-controls flex-shrink-0 flex items-center justify-center gap-3">
          <Toolbar
            availableBlocks={availableToolbarBlocks}
            blockCounts={availableBlockCounts}
            selected={selectedBlock}
            onSelect={(type) => {
              setSelectedBlock(type);
              setSelectedBlockId(null);
            }}
            onBlockDragMove={handleBlockDragMove}
            onBlockDragEnd={handleBlockDragEnd}
            onBlockDragCancel={handleBlockDragCancel}
          />
        </div>
      </div>

      {toolbarGhost && (
        <div
          style={{
            position: 'fixed',
            left: toolbarGhost.x,
            top: toolbarGhost.y,
            width: 48,
            height: 48,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 9999,
            opacity: 0.85,
            borderRadius: 10,
            background:
              'radial-gradient(circle at 35% 35%, rgba(80,80,100,0.95), rgba(20,20,35,0.98))',
            border: '1px solid rgba(160,140,255,0.55)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        />
      )}
    </main>
  );
}
