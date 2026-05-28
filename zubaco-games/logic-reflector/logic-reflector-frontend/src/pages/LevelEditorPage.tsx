/**
 * Logic Reflector — WYSIWYG Level Editor  v2
 * DEV ONLY — default export required for React.lazy().
 *
 * Drag blocks from the palette onto the grid.
 * Drag existing grid cells to reposition them.
 * Rotate button on the emitter to set direction.
 * Block visuals match the actual game exactly.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AvailableBlock,
  BlockType,
  CellType,
  Direction,
  GameLevel,
  PlacedBlock,
  ServerCell,
} from '@/types/logic-reflector';
import { simulateLaser, targetKey, pointForCell } from '@/game/laserEngine';
import { EmitterIcon, TargetIcon } from '@/features/game/components/GameCell';
import { LaserBeam } from '@/features/game/components/LaserBeam';
import './level-editor.css';

// ── Constants ─────────────────────────────────────────────────────────────────

const CELL_SIZE = 64;
const STORAGE_KEY = 'lr-editor:draft:v1';
const DND_KEY = 'application/lr-editor';

const DIRECTIONS: Direction[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const BLOCK_TYPES: BlockType[] = [
  'reflect-block',
  'mirror-fwd',
  'mirror-bwd',
  'splitter',
  'blocker',
];

const BLOCK_LABELS: Record<BlockType, string> = {
  'reflect-block': 'Reflect',
  'mirror-fwd':    'Mirror /',
  'mirror-bwd':    'Mirror \\',
  splitter:        'Splitter',
  blocker:         'Blocker',
};

const DIR_ARROWS: Record<Direction, string> = {
  N: '↑', NE: '↗', E: '→', SE: '↘',
  S: '↓', SW: '↙', W: '←', NW: '↖',
};

// ── Backend numeric type codes (mirrors gameApi.ts) ────────────────────────────
// Fixed-cell types (used in the `cells` array)
const CELL_TYPE_TO_CODE: Record<string, number> = {
  emitter: 1, target: 2, blocker: 3,
  'reflect-block': 4, 'mirror-fwd': 5, 'mirror-bwd': 6, splitter: 7,
};
const CELL_TYPE_FROM_CODE: Record<number, CellType> = {
  1: 'emitter', 2: 'target', 3: 'blocker',
  4: 'reflect-block', 5: 'mirror-fwd', 6: 'mirror-bwd', 7: 'splitter',
};
// Placeable block types (used in `initialBlocks` / `availableBlocks`)
const BLOCK_TYPE_TO_CODE: Record<string, number> = {
  'reflect-block': 1, 'mirror-fwd': 2, 'mirror-bwd': 3, splitter: 4, blocker: 5,
};
const BLOCK_TYPE_FROM_CODE: Record<number, BlockType> = {
  1: 'reflect-block', 2: 'mirror-fwd', 3: 'mirror-bwd', 4: 'splitter', 5: 'blocker',
};

// ── Drag payload ──────────────────────────────────────────────────────────────

interface DragPayload {
  source:   'palette' | 'grid';
  cellType: CellType | 'init-block';
  direction?: Direction;
  angle?:     number;
  radius?:    number;
  blockType?: BlockType;  // for init-block palette tiles
  fromRow?:   number;
  fromCol?:   number;
}

// ── Block visual (identical to the actual game) ───────────────────────────────

function BlockVisual({
  type,
  direction,
  angle,
  isLit = false,
}: {
  type: CellType | BlockType;
  direction?: Direction;
  angle?: number;
  isLit?: boolean;
}) {
  if (type === 'emitter') {
    return <EmitterIcon direction={direction} angle={angle} />;
  }

  if (type === 'target') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <TargetIcon lit={isLit} />
      </div>
    );
  }

  const tileStyle: React.CSSProperties | undefined = isLit
    ? {
        background: 'radial-gradient(circle at center, rgba(0,200,255,0.18), rgba(20,20,35,0.92))',
        boxShadow: '0 0 10px rgba(0,200,255,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
        border: '1px solid rgba(80,80,100,0.5)',
      }
    : undefined;

  return (
    <div className="le-btile" style={tileStyle}>
      {type === 'reflect-block' && <div className="le-btile__sheen" />}

      {type === 'mirror-fwd' && (
        <svg viewBox="0 0 40 40" className="le-btile__svg">
          <line x1="8" y1="32" x2="32" y2="8"
            stroke="rgba(180,180,255,0.85)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}

      {type === 'mirror-bwd' && (
        <svg viewBox="0 0 40 40" className="le-btile__svg">
          <line x1="8" y1="8" x2="32" y2="32"
            stroke="rgba(180,180,255,0.85)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}

      {type === 'splitter' && (
        <svg viewBox="0 0 40 40" className="le-btile__svg">
          <line x1="20" y1="4"  x2="20" y2="36"
            stroke="rgba(100,230,180,0.85)" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="4"  y1="20" x2="36" y2="20"
            stroke="rgba(100,230,180,0.85)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}

      {type === 'blocker' && (
        <div style={{
          width: '80%', height: '80%',
          borderRadius: 6,
          background: 'rgba(220,60,60,0.7)',
        }} />
      )}
    </div>
  );
}

// ── Editor state ──────────────────────────────────────────────────────────────

interface EditorState {
  levelId:         string;
  name:       string;
  cols:            number;
  rows:            number;
  cells:           ServerCell[];
  initialBlocks:   PlacedBlock[];
  availableBlocks: AvailableBlock[];
}

type ImportedCell = Omit<ServerCell, 'type'> & { type: unknown };
type ImportedBlock = Omit<PlacedBlock, 'type'> & { type: unknown };
type ImportedAvailableBlock = Omit<AvailableBlock, 'type'> & { type: unknown };
type ImportedLevel = Partial<Omit<GameLevel, 'cells' | 'initialBlocks' | 'availableBlocks'>> & {
  name?: unknown;
  cells?: ImportedCell[];
  initialBlocks?: ImportedBlock[];
  availableBlocks?: ImportedAvailableBlock[];
};

function uniqueLevelName(): string {
  const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`).slice(0, 8);
  return `level-${id}`;
}

function makeDefault(): EditorState {
  return {
    levelId:         'lr-001',
    name:            '',
    cols:            6,
    rows:            6,
    cells:           [],
    initialBlocks:   [],
    availableBlocks: BLOCK_TYPES.map((type) => ({ type, count: 0 })),
  };
}

function loadDraft(): EditorState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as EditorState) : null;
  } catch { return null; }
}

function persist(s: EditorState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

function ck(row: number, col: number) { return `${row},${col}`; }

function round3(n: number) { return Math.round(n * 1000) / 1000; }

function cleanCell(c: ServerCell): Record<string, unknown> {
  const o: Record<string, unknown> = {
    row: c.row,
    col: c.col,
    // Export numeric code to match the backend enum format
    type: CELL_TYPE_TO_CODE[c.type] ?? c.type,
    fixed: c.fixed,
  };
  if (c.id)                        o.id        = c.id;
  if (c.direction !== undefined)   o.direction = c.direction;
  if (c.angle     !== undefined)   o.angle     = c.angle;
  if (typeof c.x      === 'number') o.x        = round3(c.x);
  if (typeof c.y      === 'number') o.y        = round3(c.y);
  if (typeof c.radius === 'number') o.radius   = round3(c.radius);
  if (typeof c.size   === 'number') o.size     = round3(c.size);
  return o;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LevelEditorPage() {
  const [state, setStateRaw] = useState<EditorState>(() => loadDraft() ?? makeDefault());

  // active tool (drag is primary; select/erase are secondary)
  const [activeTool, setActiveTool] = useState<'select' | 'erase'>('select');
  const [selectedCell, setSelectedCell] = useState<string | null>(null);

  // drag-and-drop state
  const [dragOverCell, setDragOverCell] = useState<{ row: number; col: number } | null>(null);
  const [draggingCell, setDraggingCell] = useState<string | null>(null);
  const dragLeaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragEffectRef   = useRef<'copy' | 'move'>('copy');

  // UI state
  const [hoveredCell, setHoveredCell]   = useState<string | null>(null);
  const [exportJson,  setExportJson]    = useState('');
  const [importText,  setImportText]    = useState('');
  const [importError, setImportError]   = useState('');
  const [copyLabel,   setCopyLabel]     = useState('Copy');

  // emitter palette settings
  const [emitterDir,  setEmitterDir]    = useState<Direction>('E');

  // target palette settings
  const [targetRadius, setTargetRadius] = useState(0.15);

  // ── State mutation helper (auto-persists) ─────────────────────────────────
  function setState(updater: (prev: EditorState) => EditorState) {
    setStateRaw((prev) => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  }

  // ── Laser simulation ──────────────────────────────────────────────────────
  const laserResult = useMemo(() => {
    const level: GameLevel = {
      levelId: state.levelId,
      levelNumber: 0,
      gridSize: { x: state.cols, y: state.rows },
      cells: state.cells,
    };
    return simulateLaser(level, state.initialBlocks);
  }, [state]);

  const { arms: beamArms, litTargetKeys } = laserResult;

  // ── Derived maps ──────────────────────────────────────────────────────────
  const fixedMap = useMemo(() => {
    const m = new Map<string, ServerCell>();
    for (const c of state.cells) m.set(ck(c.row, c.col), c);
    return m;
  }, [state.cells]);

  const initMap = useMemo(() => {
    const m = new Map<string, BlockType>();
    for (const b of state.initialBlocks) m.set(ck(b.row, b.col), b.type);
    return m;
  }, [state.initialBlocks]);

  const targets = useMemo(
    () => state.cells.filter((c) => c.type === 'target'),
    [state.cells],
  );

  const floatingEmitters = useMemo(
    () => state.cells.filter(
      (c) => c.type === 'emitter' && (typeof c.x === 'number' || typeof c.y === 'number'),
    ),
    [state.cells],
  );

  // Map target row,col → its targetKey (needed for lit check)
  const targetKeyMap = useMemo(() => {
    const m = new Map<string, string>();
    targets.forEach((t, i) => m.set(ck(t.row, t.col), targetKey(t, i)));
    return m;
  }, [targets]);

  // ── Selected cell data ────────────────────────────────────────────────────
  const selData = useMemo(() => {
    if (!selectedCell) return null;
    const [rStr, cStr] = selectedCell.split(',');
    const r = parseInt(rStr!), c = parseInt(cStr!);
    return { row: r, col: c, fixed: fixedMap.get(selectedCell), init: initMap.get(selectedCell) };
  }, [selectedCell, fixedMap, initMap]);

  function patchSelected(patch: Partial<ServerCell>) {
    if (!selData?.fixed) return;
    setState((prev) => ({
      ...prev,
      cells: prev.cells.map((c) =>
        c.row === selData.row && c.col === selData.col ? { ...c, ...patch } : c,
      ),
    }));
  }

  function deleteSelected() {
    if (!selData) return;
    const { row, col } = selData;
    setState((prev) => ({
      ...prev,
      cells:         prev.cells.filter((c) => !(c.row === row && c.col === col)),
      initialBlocks: prev.initialBlocks.filter((b) => !(b.row === row && b.col === col)),
    }));
    setSelectedCell(null);
  }

  // ── Emitter rotate ────────────────────────────────────────────────────────
  // When an emitter is selected, rotating also updates the placed cell so the
  // board reflects the change immediately. `angle` is cleared so `direction`
  // always drives the visual (important for imported levels that carry an angle).
  const rotateCW = () => {
    setEmitterDir((d) => DIRECTIONS[(DIRECTIONS.indexOf(d) + 1) % 8]!);
    if (selData?.fixed?.type === 'emitter') {
      const d = selData.fixed.direction ?? 'E';
      patchSelected({ direction: DIRECTIONS[(DIRECTIONS.indexOf(d) + 1) % 8], angle: undefined });
    }
  };
  const rotateCCW = () => {
    setEmitterDir((d) => DIRECTIONS[(DIRECTIONS.indexOf(d) + 7) % 8]!);
    if (selData?.fixed?.type === 'emitter') {
      const d = selData.fixed.direction ?? 'E';
      patchSelected({ direction: DIRECTIONS[(DIRECTIONS.indexOf(d) + 7) % 8], angle: undefined });
    }
  };

  // Sync palette controls to the selected cell so that the palette inputs always
  // reflect — and drive — the currently selected emitter/target on the board.
  useEffect(() => {
    if (selData?.fixed?.type === 'emitter') {
      setEmitterDir(selData.fixed.direction ?? 'E');
    } else if (selData?.fixed?.type === 'target') {
      setTargetRadius(selData.fixed.radius ?? 0.15);
    }
  }, [selData]);

  // ── Cell placement (shared by drag-drop + click-to-erase/select) ──────────
  function placePayload(toRow: number, toCol: number, payload: DragPayload) {
    setState((prev) => {
      let cells         = [...prev.cells];
      let initialBlocks = [...prev.initialBlocks];

      // If moving an existing cell, remove it from its old position first
      if (payload.source === 'grid' &&
          payload.fromRow !== undefined &&
          payload.fromCol !== undefined) {
        if (payload.fromRow === toRow && payload.fromCol === toCol) return prev;
        cells         = cells.filter((c) => !(c.row === payload.fromRow && c.col === payload.fromCol));
        initialBlocks = initialBlocks.filter((b) => !(b.row === payload.fromRow && b.col === payload.fromCol));
      }

      // Clear the target cell
      cells         = cells.filter((c) => !(c.row === toRow && c.col === toCol));
      initialBlocks = initialBlocks.filter((b) => !(b.row === toRow && b.col === toCol));

      // Place
      if (payload.cellType === 'emitter') {
        cells = [...cells, {
          row: toRow, col: toCol, type: 'emitter' as const, fixed: true,
          direction: payload.direction ?? 'E',
          ...(payload.angle !== undefined ? { angle: payload.angle } : {}),
          x: toCol + 0.5, y: toRow + 0.5,
        }];
      } else if (payload.cellType === 'target') {
        cells = [...cells, {
          row: toRow, col: toCol, type: 'target' as const, fixed: true,
          radius: payload.radius ?? 0.15,
          x: toCol + 0.5, y: toRow + 0.5,
        }];
      } else if (payload.cellType === 'init-block' && payload.blockType) {
        initialBlocks = [...initialBlocks, {
          row: toRow, col: toCol, type: payload.blockType, seeded: true,
        }];
      } else if (BLOCK_TYPES.includes(payload.cellType as BlockType)) {
        cells = [...cells, {
          row: toRow, col: toCol,
          type: payload.cellType as BlockType,
          fixed: true,
        }];
      }

      return { ...prev, cells, initialBlocks };
    });
  }

  // ── Drag handlers (palette → grid) ───────────────────────────────────────
  function startPaletteDrag(e: React.DragEvent, payload: DragPayload) {
    dragEffectRef.current = 'copy';
    e.dataTransfer.setData(DND_KEY, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  }

  // ── Drag handlers (grid → grid) ──────────────────────────────────────────
  function startGridDrag(e: React.DragEvent, row: number, col: number) {
    const key = ck(row, col);
    const fixed = fixedMap.get(key);
    const initType = initMap.get(key);
    if (!fixed && !initType) { e.preventDefault(); return; }

    dragEffectRef.current = 'move';
    const payload: DragPayload = {
      source:    'grid',
      cellType:  fixed?.type ?? 'init-block',
      direction: fixed?.direction,
      angle:     fixed?.angle,
      radius:    fixed?.radius,
      blockType: initType,
      fromRow:   row,
      fromCol:   col,
    };
    e.dataTransfer.setData(DND_KEY, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingCell(key);
  }

  function handleGridDragEnd() {
    dragEffectRef.current = 'copy';
    setDraggingCell(null);
    setDragOverCell(null);
  }

  // ── Drop zone handlers ────────────────────────────────────────────────────
  function handleDragOver(e: React.DragEvent, row: number, col: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = dragEffectRef.current;
    if (dragLeaveTimer.current) { clearTimeout(dragLeaveTimer.current); dragLeaveTimer.current = null; }
    setDragOverCell({ row, col });
  }

  function handleDragLeave() {
    dragLeaveTimer.current = setTimeout(() => setDragOverCell(null), 60);
  }

  function handleDrop(e: React.DragEvent, row: number, col: number) {
    e.preventDefault();
    setDragOverCell(null);
    setDraggingCell(null);
    const raw = e.dataTransfer.getData(DND_KEY);
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as DragPayload;
      placePayload(row, col, payload);

      // Keep selection in sync after a drop:
      // • Grid→Grid: selection follows the moved cell to its new position.
      // • Palette→Grid: auto-select the newly placed cell so the inspector
      //   opens immediately and you can edit its properties right away.
      if (activeTool === 'select') {
        if (
          payload.source === 'grid' &&
          payload.fromRow !== undefined &&
          payload.fromCol !== undefined
        ) {
          const fromKey = ck(payload.fromRow, payload.fromCol);
          const toKey   = ck(row, col);
          if (fromKey !== toKey) setSelectedCell(toKey);
        } else if (payload.source === 'palette') {
          // Auto-select anything dropped from the palette so you can immediately
          // move or edit it (arrow keys, rotation, radius, etc.).
          setSelectedCell(ck(row, col));
        }
      }
    } catch { /* invalid data */ }
  }

  // ── Click on a grid cell (select / erase) ─────────────────────────────────
  const handleCellClick = useCallback((row: number, col: number) => {
    const key = ck(row, col);
    if (activeTool === 'erase') {
      setState((prev) => ({
        ...prev,
        cells:         prev.cells.filter((c) => !(c.row === row && c.col === col)),
        initialBlocks: prev.initialBlocks.filter((b) => !(b.row === row && b.col === col)),
      }));
      if (selectedCell === key) setSelectedCell(null);
      return;
    }
    // select
    setSelectedCell((prev) => (prev === key ? null : key));
  }, [activeTool, selectedCell]);

  // Right-click always erases
  const handleContextMenu = useCallback((e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    const key = ck(row, col);
    setState((prev) => ({
      ...prev,
      cells:         prev.cells.filter((c) => !(c.row === row && c.col === col)),
      initialBlocks: prev.initialBlocks.filter((b) => !(b.row === row && b.col === col)),
    }));
    if (selectedCell === key) setSelectedCell(null);
  }, [selectedCell]);

  // ── Arrow keys move the selected cell ─────────────────────────────────────
  // Emitter / target: fine sub-cell x/y nudge (0.05 units; Shift = 0.25).
  // All other fixed cells and init-blocks: whole-cell grid moves.
  const moveSelectedByKey = useCallback((e: KeyboardEvent) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    // Let inputs keep their native arrow-key behaviour
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (activeTool !== 'select' || !selData) return;
    // Nothing to move if neither a fixed cell nor an init-block is selected
    if (!selData.fixed && !selData.init) return;

    e.preventDefault();

    // ── Emitter / target: fine-grained x/y nudge ───────────────────────────
    if (selData.fixed?.type === 'emitter' || selData.fixed?.type === 'target') {
      const step = e.shiftKey ? 0.25 : 0.05;
      const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
      const dy = e.key === 'ArrowUp'   ? -step : e.key === 'ArrowDown'  ? step : 0;

      setState((prev) => {
        const fixed = prev.cells.find((c) => c.row === selData.row && c.col === selData.col);
        if (!fixed) return prev;

        const curX = typeof fixed.x === 'number' ? fixed.x : selData.col + 0.5;
        const curY = typeof fixed.y === 'number' ? fixed.y : selData.row + 0.5;

        const newX = Math.round(Math.max(0, Math.min(prev.cols, curX + dx)) * 1000) / 1000;
        const newY = Math.round(Math.max(0, Math.min(prev.rows, curY + dy)) * 1000) / 1000;

        const newRow = Math.min(prev.rows - 1, Math.floor(newY));
        const newCol = Math.min(prev.cols - 1, Math.floor(newX));

        let cells = prev.cells.filter((c) => !(c.row === selData.row && c.col === selData.col));
        if (newRow !== selData.row || newCol !== selData.col) {
          cells = cells.filter((c) => !(c.row === newRow && c.col === newCol));
        }
        cells = [...cells, { ...fixed, row: newRow, col: newCol, x: newX, y: newY }];
        return { ...prev, cells };
      });

      // Keep selectedCell key in sync when crossing a cell boundary
      const curX = typeof selData.fixed.x === 'number' ? selData.fixed.x : selData.col + 0.5;
      const curY = typeof selData.fixed.y === 'number' ? selData.fixed.y : selData.row + 0.5;
      const newX = Math.max(0, Math.min(state.cols, curX + dx));
      const newY = Math.max(0, Math.min(state.rows, curY + dy));
      const newRow = Math.min(state.rows - 1, Math.floor(newY));
      const newCol = Math.min(state.cols - 1, Math.floor(newX));
      if (newRow !== selData.row || newCol !== selData.col) {
        setSelectedCell(ck(newRow, newCol));
      }
      return;
    }

    // ── Fixed blocks and init-blocks: whole-cell grid move ──────────────────
    const dr = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown'  ? 1 : 0;
    const dc = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
    const newRow = Math.max(0, Math.min(state.rows - 1, selData.row + dr));
    const newCol = Math.max(0, Math.min(state.cols - 1, selData.col + dc));
    if (newRow === selData.row && newCol === selData.col) return; // already at edge

    if (selData.fixed) {
      // Fixed block (reflect-block, mirror-fwd, mirror-bwd, splitter, blocker)
      setState((prev) => ({
        ...prev,
        cells: [
          ...prev.cells.filter((c) =>
            !(c.row === selData.row && c.col === selData.col) &&
            !(c.row === newRow       && c.col === newCol),
          ),
          { ...selData.fixed!, row: newRow, col: newCol },
        ],
      }));
    } else {
      // Init-block
      setState((prev) => ({
        ...prev,
        initialBlocks: [
          ...prev.initialBlocks.filter((b) =>
            !(b.row === selData.row && b.col === selData.col) &&
            !(b.row === newRow       && b.col === newCol),
          ),
          { row: newRow, col: newCol, type: selData.init!, seeded: true },
        ],
      }));
    }
    setSelectedCell(ck(newRow, newCol));
  }, [activeTool, selData, state.rows, state.cols]);

  useEffect(() => {
    window.addEventListener('keydown', moveSelectedByKey);
    return () => window.removeEventListener('keydown', moveSelectedByKey);
  }, [moveSelectedByKey]);

  // ── Grid size change (prune out-of-bounds cells) ──────────────────────────
  function setGridCols(v: number) {
    const cols = Math.max(2, Math.min(20, v));
    setState((prev) => ({
      ...prev, cols,
      cells:         prev.cells.filter((c) => c.col < cols),
      initialBlocks: prev.initialBlocks.filter((b) => b.col < cols),
    }));
  }

  function setGridRows(v: number) {
    const rows = Math.max(2, Math.min(20, v));
    setState((prev) => ({
      ...prev, rows,
      cells:         prev.cells.filter((c) => c.row < rows),
      initialBlocks: prev.initialBlocks.filter((b) => b.row < rows),
    }));
  }

  // ── Block count stepper ───────────────────────────────────────────────────
  function stepBlock(type: BlockType, delta: number) {
    setState((prev) => ({
      ...prev,
      availableBlocks: prev.availableBlocks.map((b) =>
        b.type === type ? { ...b, count: Math.max(0, b.count + delta) } : b,
      ),
    }));
  }

  function blockCount(type: BlockType) {
    return state.availableBlocks.find((b) => b.type === type)?.count ?? 0;
  }

  // ── Export / import ───────────────────────────────────────────────────────
  function handleExport() {
    const resolvedName = state.name.trim() || uniqueLevelName();
    if (!state.name.trim()) setState((p) => ({ ...p, name: resolvedName }));
    const out: Record<string, unknown> = {
      levelId: state.levelId,
      name:    resolvedName,
      gridSize:  { x: state.cols, y: state.rows },
      cells:       state.cells.map(cleanCell),
    };
    if (state.initialBlocks.length > 0) {
      out.initialBlocks = state.initialBlocks.map((b) => ({
        ...b,
        type: BLOCK_TYPE_TO_CODE[b.type] ?? b.type,
      }));
    }
    const nonZero = state.availableBlocks.filter((b) => b.count > 0);
    if (nonZero.length > 0) {
      out.availableBlocks = nonZero.map((b) => ({
        type: BLOCK_TYPE_TO_CODE[b.type] ?? b.type,
        count: b.count,
      }));
    }
    setExportJson(JSON.stringify(out, null, 2));
  }

  function handleCopy() {
    navigator.clipboard.writeText(exportJson)
      .then(() => { setCopyLabel('Copied!'); setTimeout(() => setCopyLabel('Copy'), 2000); })
      .catch(() => { setCopyLabel('Failed');  setTimeout(() => setCopyLabel('Copy'), 2000); });
  }

  function handleImport() {
    setImportError('');
    try {
      const parsed = JSON.parse(importText) as ImportedLevel;
      if (!parsed.gridSize || !Array.isArray(parsed.cells)) {
        setImportError('Invalid JSON: missing gridSize or cells'); return;
      }
      // Normalize cell/block types: backend JSON uses numeric codes; editor uses strings.
      const normCellType = (raw: unknown): CellType => {
        if (typeof raw === 'number') return CELL_TYPE_FROM_CODE[raw] ?? 'emitter';
        return raw as CellType;
      };
      const normBlockType = (raw: unknown): BlockType => {
        if (typeof raw === 'number') return BLOCK_TYPE_FROM_CODE[raw] ?? 'reflect-block';
        return raw as BlockType;
      };

      const next: EditorState = {
        levelId:   parsed.levelId   ?? 'lr-import',
        name: typeof parsed.name === 'string' ? parsed.name : '',
        cols:        parsed.gridSize.x,
        rows:        parsed.gridSize.y,
        cells: parsed.cells.map((c) => ({
          ...c,
          type: normCellType(c.type),
        })),
        initialBlocks: (parsed.initialBlocks ?? []).map((b) => ({
          ...b,
          type: normBlockType(b.type),
        })),
        availableBlocks: (() => {
          const base = BLOCK_TYPES.map((type) => ({ type, count: 0 }));
          for (const ab of parsed.availableBlocks ?? []) {
            const abType = normBlockType(ab.type);
            const f = base.find((b) => b.type === abType);
            if (f) f.count = ab.count ?? 0;
          }
          return base;
        })(),
      };
      setStateRaw(next); persist(next);
      setImportText(''); setSelectedCell(null);
    } catch { setImportError('Parse error — invalid JSON'); }
  }

  function handleClear() {
    if (window.confirm('Clear the board? All cells and blocks will be removed.')) {
      setState((prev) => ({ ...prev, cells: [], initialBlocks: [] }));
      setSelectedCell(null);
    }
  }

  // ── Cell rendering ────────────────────────────────────────────────────────
  function cellClass(row: number, col: number): string {
    const key  = ck(row, col);
    const fixed = fixedMap.get(key);
    const isInit = initMap.has(key);
    const isDragOver  = dragOverCell?.row === row && dragOverCell?.col === col;
    const isDragging  = draggingCell === key;
    const isSelected  = selectedCell === key;
    const isHovered   = hoveredCell  === key;

    const parts = ['le-cell'];
    if      (isInit)              parts.push('le-cell--init-block');
    else if (fixed?.type === 'emitter')        parts.push('le-cell--emitter');
    else if (fixed?.type === 'target')         parts.push('le-cell--target');
    else if (fixed?.type === 'reflect-block')  parts.push('le-cell--reflect-block');
    else if (fixed?.type === 'mirror-fwd')     parts.push('le-cell--mirror-fwd');
    else if (fixed?.type === 'mirror-bwd')     parts.push('le-cell--mirror-bwd');
    else if (fixed?.type === 'splitter')       parts.push('le-cell--splitter');
    else if (fixed?.type === 'blocker')        parts.push('le-cell--blocker');
    else                                       parts.push('le-cell--empty');

    if (isDragOver)                parts.push('le-cell--dragover');
    if (isDragging)                parts.push('le-cell--dragging');
    if (isSelected)                parts.push('le-cell--selected');
    else if (isHovered && !isDragging) {
      parts.push(activeTool === 'erase' ? 'le-cell--hovered-erase' : 'le-cell--hovered');
    }

    return parts.join(' ');
  }

  function cellContent(row: number, col: number): React.ReactNode {
    const key   = ck(row, col);
    const fixed = fixedMap.get(key);
    const initType = initMap.get(key);

    if (fixed) {
      const isLit = fixed.type === 'target'
        ? litTargetKeys.has(targetKeyMap.get(key) ?? '')
        : false;
      return (
        <BlockVisual
          type={fixed.type}
          direction={fixed.direction}
          angle={fixed.angle}
          isLit={isLit}
        />
      );
    }

    if (initType) {
      return (
        <>
          <BlockVisual type={initType} />
          <span className="le-cell__init-badge">init</span>
        </>
      );
    }

    return null;
  }

  // ── Layout dims ───────────────────────────────────────────────────────────
  const containerW = state.cols * CELL_SIZE + (state.cols - 1);
  const containerH = state.rows * CELL_SIZE + (state.rows - 1);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="le-root">

      {/* ── Header ── */}
      <header className="le-header">
        <h1 className="le-header__title">⚡ Logic Reflector — Level Editor</h1>
        <div className="le-header__right">
          <span className="le-info">auto-saved · right-click to erase</span>
          <span className="le-header__badge">DEV ONLY</span>
        </div>
      </header>

      <div className="le-body">

        {/* ── Left panel ── */}
        <aside className="le-panel">

          {/* Level metadata */}
          <div className="le-section">
            <p className="le-section__title">Level</p>
            <div className="le-field">
              <label>ID</label>
              <input className="le-input" type="text" value={state.levelId}
                onChange={(e) => setState((p) => ({ ...p, levelId: e.target.value }))} />
            </div>
            <div className="le-field">
              <label>Name</label>
              <input className="le-input" type="text"
                value={state.name}
                onChange={(e) => setState((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="le-field">
              <label>Grid</label>
              <input className="le-input le-input--sm" type="number" min={2} max={20}
                title="Columns" value={state.cols}
                onChange={(e) => setGridCols(parseInt(e.target.value) || 2)} />
              <span className="le-dim-sep">×</span>
              <input className="le-input le-input--sm" type="number" min={2} max={20}
                title="Rows" value={state.rows}
                onChange={(e) => setGridRows(parseInt(e.target.value) || 2)} />
              <span className="le-dim-label">cols×rows</span>
            </div>
          </div>

          {/* Palette */}
          <div className="le-section">
            <p className="le-section__title">Palette — drag onto grid</p>

            {/* Emitter */}
            <p className="le-palette-group__label">Emitter</p>
            <div className="le-emitter-row">
              <button className="le-rotate-btn" onClick={rotateCCW} title="Rotate counter-clockwise">⟲</button>
              <div
                className="le-palette-tile"
                draggable
                onDragStart={(e) => startPaletteDrag(e, { source: 'palette', cellType: 'emitter', direction: emitterDir })}
                title={`Emitter — direction ${emitterDir} ${DIR_ARROWS[emitterDir]}`}
              >
                <EmitterIcon direction={emitterDir} />
              </div>
              <button className="le-rotate-btn" onClick={rotateCW} title="Rotate clockwise">⟳</button>
              <span className="le-dir-badge">{DIR_ARROWS[emitterDir]} {emitterDir}</span>
            </div>

            {/* Target */}
            <p className="le-palette-group__label" style={{ marginTop: 12 }}>Target</p>
            <div className="le-emitter-row" style={{ gap: 10 }}>
              <div
                className="le-palette-tile"
                draggable
                onDragStart={(e) => startPaletteDrag(e, { source: 'palette', cellType: 'target', radius: targetRadius })}
                title="Target"
              >
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TargetIcon lit={false} />
                </div>
              </div>
              <div className="le-field" style={{ margin: 0, flex: 1 }}>
                <label style={{ fontSize: 10, minWidth: 38 }}>Radius</label>
                <input
                  className="le-input le-input--sm"
                  type="number" step={0.01} min={0.05} max={0.8}
                  value={targetRadius}
                  onChange={(e) => {
                    const r = parseFloat(e.target.value) || 0.15;
                    setTargetRadius(r);
                    if (selData?.fixed?.type === 'target') patchSelected({ radius: r });
                  }}
                />
              </div>
            </div>

            {/* Fixed blocks */}
            <p className="le-palette-group__label" style={{ marginTop: 14 }}>Fixed Blocks</p>
            <div className="le-palette-row">
              {BLOCK_TYPES.map((bt) => (
                <div key={bt}
                  className="le-palette-tile"
                  draggable
                  onDragStart={(e) => startPaletteDrag(e, { source: 'palette', cellType: bt })}
                  title={BLOCK_LABELS[bt]}
                >
                  <BlockVisual type={bt} />
                </div>
              ))}
            </div>
            <div className="le-palette-labels">
              {BLOCK_TYPES.map((bt) => (
                <span key={bt} className="le-palette-label">{BLOCK_LABELS[bt]}</span>
              ))}
            </div>

            {/* Init blocks */}
            <p className="le-palette-group__label" style={{ marginTop: 14 }}>
              Init Blocks <span style={{ opacity: 0.45, fontWeight: 'normal' }}>(pre-placed)</span>
            </p>
            <div className="le-palette-row">
              {BLOCK_TYPES.map((bt) => (
                <div key={bt}
                  className="le-palette-tile le-palette-tile--init"
                  draggable
                  onDragStart={(e) => startPaletteDrag(e, { source: 'palette', cellType: 'init-block', blockType: bt })}
                  title={`${BLOCK_LABELS[bt]} (init)`}
                >
                  <BlockVisual type={bt} />
                </div>
              ))}
            </div>
          </div>

          {/* Tools (select / erase) */}
          <div className="le-section">
            <p className="le-section__title">Tool</p>
            <div className="le-tool-row">
              <button
                className={`le-tool-btn${activeTool === 'select' ? ' le-tool-btn--active' : ''}`}
                onClick={() => setActiveTool('select')}
              >✥ Select</button>
              <button
                className={`le-tool-btn${activeTool === 'erase' ? ' le-tool-btn--active' : ''}`}
                onClick={() => setActiveTool('erase')}
              >⌫ Erase</button>
            </div>
          </div>

          {/* Selected cell properties */}
          {activeTool === 'select' && selData && (
            <div className="le-section">
              <p className="le-section__title">
                {selData.fixed
                  ? `Cell (${selData.row},${selData.col}) — ${selData.fixed.type}`
                  : `Init block (${selData.row},${selData.col}) — ${selData.init ?? ''}`
                }
              </p>

              {/* Arrow-key nudge hint — only for emitter / target */}
              {selData.fixed && (selData.fixed.type === 'emitter' || selData.fixed.type === 'target') && (
                <p className="le-info" style={{ marginBottom: 10 }}>
                  ← → ↑ ↓ nudge x/y &nbsp;·&nbsp; Shift = ×5 step
                </p>
              )}

              {selData.fixed?.type === 'emitter' && (
                <>
                  <p className="le-prop-heading">Direction</p>
                  <div className="le-emitter-row" style={{ marginBottom: 10 }}>
                    <button className="le-rotate-btn" onClick={() => {
                      const d = selData.fixed?.direction ?? 'E';
                      patchSelected({ direction: DIRECTIONS[(DIRECTIONS.indexOf(d) + 7) % 8], angle: undefined });
                    }}>⟲</button>
                    <div className="le-palette-tile" style={{ pointerEvents: 'none', flexShrink: 0 }}>
                      <EmitterIcon direction={selData.fixed.direction} />
                    </div>
                    <button className="le-rotate-btn" onClick={() => {
                      const d = selData.fixed?.direction ?? 'E';
                      patchSelected({ direction: DIRECTIONS[(DIRECTIONS.indexOf(d) + 1) % 8], angle: undefined });
                    }}>⟳</button>
                    <span className="le-dir-badge">
                      {DIR_ARROWS[selData.fixed.direction ?? 'E']} {selData.fixed.direction ?? 'E'}
                    </span>
                  </div>
                  <div className="le-prop-row">
                    <label>X</label>
                    <input className="le-input le-input--sm" type="number" step={0.05}
                      value={selData.fixed.x ?? selData.col + 0.5}
                      onChange={(e) => patchSelected({ x: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="le-prop-row">
                    <label>Y</label>
                    <input className="le-input le-input--sm" type="number" step={0.05}
                      value={selData.fixed.y ?? selData.row + 0.5}
                      onChange={(e) => patchSelected({ y: parseFloat(e.target.value) || 0 })} />
                  </div>
                </>
              )}

              {selData.fixed?.type === 'target' && (
                <>
                  <div className="le-prop-row">
                    <label>Radius</label>
                    <input className="le-input le-input--sm" type="number" step={0.01} min={0.05} max={0.8}
                      value={selData.fixed.radius ?? 0.15}
                      onChange={(e) => {
                        const r = parseFloat(e.target.value) || 0.15;
                        patchSelected({ radius: r });
                        setTargetRadius(r);
                      }} />
                  </div>
                  <div className="le-prop-row">
                    <label>X</label>
                    <input className="le-input le-input--sm" type="number" step={0.05}
                      value={selData.fixed.x ?? selData.col + 0.5}
                      onChange={(e) => patchSelected({ x: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="le-prop-row">
                    <label>Y</label>
                    <input className="le-input le-input--sm" type="number" step={0.05}
                      value={selData.fixed.y ?? selData.row + 0.5}
                      onChange={(e) => patchSelected({ y: parseFloat(e.target.value) || 0 })} />
                  </div>
                </>
              )}

              <button className="le-btn le-btn--danger" style={{ marginTop: 6 }}
                onClick={deleteSelected}>Delete cell</button>
            </div>
          )}

          {/* Available blocks (toolbar inventory) */}
          <div className="le-section">
            <p className="le-section__title">Available Blocks (toolbar)</p>
            {BLOCK_TYPES.map((bt) => (
              <div className="le-stepper-row" key={bt}>
                <span className="le-stepper-row__label">{BLOCK_LABELS[bt]}</span>
                <div className="le-stepper">
                  <button onClick={() => stepBlock(bt, -1)}>−</button>
                  <span className="le-stepper__val">{blockCount(bt)}</span>
                  <button onClick={() => stepBlock(bt, +1)}>+</button>
                </div>
              </div>
            ))}
          </div>

          {/* Export */}
          <div className="le-section">
            <p className="le-section__title">Export JSON</p>
            <button className="le-btn le-btn--accent" onClick={handleExport} style={{ marginBottom: 8 }}>
              Generate JSON
            </button>
            {exportJson && (
              <>
                <textarea className="le-textarea" readOnly value={exportJson} rows={10} />
                <button className="le-btn le-btn--sm" style={{ marginTop: 4 }} onClick={handleCopy}>
                  {copyLabel}
                </button>
              </>
            )}
          </div>

          {/* Import */}
          <div className="le-section">
            <p className="le-section__title">Import JSON</p>
            <textarea className="le-textarea" rows={5} placeholder="Paste level JSON…"
              value={importText} onChange={(e) => setImportText(e.target.value)} />
            {importError && <p className="le-info le-info--warn">{importError}</p>}
            <button className="le-btn le-btn--sm le-btn--accent" style={{ marginTop: 4 }}
              onClick={handleImport}>Import</button>
          </div>

          {/* Clear */}
          <div className="le-section">
            <button className="le-btn le-btn--danger" onClick={handleClear}>Clear Board</button>
          </div>

        </aside>

        {/* ── Main grid area ── */}
        <main className="le-main">
          <div className="le-grid-wrapper">
            <div className="le-grid-container"
              style={{ width: containerW, height: containerH }}>

              {/* Cell grid */}
              <div className="le-grid"
                style={{
                  gridTemplateColumns: `repeat(${state.cols}, ${CELL_SIZE}px)`,
                  gridTemplateRows:    `repeat(${state.rows}, ${CELL_SIZE}px)`,
                }}
              >
                {Array.from({ length: state.rows }, (_, r) =>
                  Array.from({ length: state.cols }, (_, c) => {
                    const key = ck(r, c);
                    const hasContent = fixedMap.has(key) || initMap.has(key);
                    return (
                      <div
                        key={key}
                        className={cellClass(r, c)}
                        onClick={() => handleCellClick(r, c)}
                        onContextMenu={(e) => handleContextMenu(e, r, c)}
                        onMouseEnter={() => setHoveredCell(key)}
                        onMouseLeave={() => setHoveredCell(null)}
                        draggable={hasContent}
                        onDragStart={(e) => startGridDrag(e, r, c)}
                        onDragEnd={handleGridDragEnd}
                        onDragOver={(e) => handleDragOver(e, r, c)}
                        onDrop={(e) => handleDrop(e, r, c)}
                        onDragLeave={handleDragLeave}
                        data-row={r}
                        data-col={c}
                      >
                        {cellContent(r, c)}
                        <span className="le-cell__coords">{r},{c}</span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Floating emitters/targets at custom coords */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
                {floatingEmitters.map((em) => {
                  const pt = pointForCell(em);
                  return (
                    <div key={em.id ?? `em:${em.row},${em.col}`}
                      className="le-floating-cell"
                      style={{ width: CELL_SIZE, height: CELL_SIZE, left: pt.x * CELL_SIZE, top: pt.y * CELL_SIZE }}>
                      <EmitterIcon direction={em.direction} angle={em.angle} />
                    </div>
                  );
                })}

                {targets.map((tgt, idx) => {
                  const pt     = pointForCell(tgt);
                  const radius = tgt.radius ?? 0.15;
                  const size   = Math.max(CELL_SIZE * 0.34, radius * CELL_SIZE * 3.8);
                  const key    = targetKey(tgt, idx);
                  return (
                    <div key={key}
                      className="le-floating-cell"
                      style={{ width: size, height: size, left: pt.x * CELL_SIZE, top: pt.y * CELL_SIZE }}>
                      <TargetIcon lit={litTargetKeys.has(key)} />
                    </div>
                  );
                })}
              </div>

              {/* Laser beam */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
                <LaserBeam arms={beamArms} cellSize={CELL_SIZE} rows={state.rows} cols={state.cols} />
              </div>

            </div>
          </div>

          {/* Legend */}
          <div className="le-legend">
            <span>Drag from palette to place</span>
            <span className="le-legend__sep">|</span>
            <span>Drag cells to move</span>
            <span className="le-legend__sep">|</span>
            <span>Right-click to erase</span>
            <span className="le-legend__sep">|</span>
            <span>{state.cells.length} fixed · {state.initialBlocks.length} init</span>
            <span className="le-legend__sep">|</span>
            <span className={litTargetKeys.size === targets.length && targets.length > 0 ? 'le-legend__lit' : ''}>
              {litTargetKeys.size}/{targets.length} targets lit
            </span>
          </div>
        </main>

      </div>
    </div>
  );
}
