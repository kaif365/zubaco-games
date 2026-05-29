import { useState, useMemo, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import type { MouseEvent } from "react";
import { useRef } from "react";
import PhaserGame, { type PhaserGameHandle } from "@/components/PhaserGame";
import {
  GAME_EVENTS,
  type GameDirection,
  type GridPos,
  type LevelData,
} from "@/game/gameTypes";
import { gameApiClient } from "@/services/gameApiClient";
import { storage } from "@/utils/storage";
import { Alert } from "@/components/ui/alert";

// ── types ─────────────────────────────────────────────────────────────────────

interface EditorArrow {
  // path in editor coords (y=0 at top), TAIL→HEAD order
  path: GridPos[];
  headDirection: GameDirection;
  colorHex: string;
}

// ── constants ─────────────────────────────────────────────────────────────────

const PALETTE = [
  "#3399ff",
  "#66e666",
  "#ffcc33",
  "#ffaa22",
  "#cc66ff",
  "#ff9933",
  "#33e5e5",
  "#ff80cc",
  "#ff6666",
];

const DIRS: { label: string; value: GameDirection; symbol: string }[] = [
  { label: "Up", value: "up", symbol: "↑" },
  { label: "Down", value: "down", symbol: "↓" },
  { label: "Left", value: "left", symbol: "←" },
  { label: "Right", value: "right", symbol: "→" },
];

const hexToNum = (hex: string) => parseInt(hex.replace("#", ""), 16);
const numToHex = (value: number) =>
  `#${Math.max(0, value).toString(16).padStart(6, "0").slice(-6)}`;

const MAX_GRID_PX = 520;
const MAX_GRID_SIZE = 50;
const LEVEL_EDITOR_DRAFT_KEY = "arrowgame:level-editor:draft:v1";

// ── path helpers ─────────────────────────────────────────────────────────────

// Fill cells between two points along the same row or column.
function fillBetween(from: GridPos, to: GridPos): GridPos[] {
  const pts: GridPos[] = [];
  if (from.x === to.x && from.y !== to.y) {
    const step = to.y > from.y ? 1 : -1;
    for (let y = from.y + step; y !== to.y; y += step)
      pts.push({ x: from.x, y });
  } else if (from.y === to.y && from.x !== to.x) {
    const step = to.x > from.x ? 1 : -1;
    for (let x = from.x + step; x !== to.x; x += step)
      pts.push({ x, y: from.y });
  }
  return pts;
}

// Infer a sensible launch direction from the last path segment.
function inferDir(path: GridPos[]): GameDirection | null {
  if (path.length < 2) return null;
  const a = path[path.length - 2];
  const b = path[path.length - 1]; // HEAD
  if (b.x > a.x) return "right";
  if (b.x < a.x) return "left";
  if (b.y < a.y) return "up"; // editor y decreases → visually upward
  if (b.y > a.y) return "down";
  return null;
}

// ── export math ───────────────────────────────────────────────────────────────
// The game uses y=0 at the BOTTOM (Unity convention).
// The editor uses y=0 at the TOP (natural screen coords).
// On export we flip every Y and the waypoints stay in TAIL→HEAD order.

function toGameWaypoints(path: GridPos[], rows: number): GridPos[] {
  return path.map((wp) => ({ x: wp.x, y: rows - 1 - wp.y }));
}

function toEditorWaypoints(path: GridPos[], rows: number): GridPos[] {
  return path.map((wp) => ({ x: wp.x, y: rows - 1 - wp.y }));
}

function isGameDirection(value: unknown): value is GameDirection {
  return (
    value === "up" || value === "down" || value === "left" || value === "right"
  );
}

function parseImportedLevel(value: unknown): LevelData {
  if (typeof value !== "object" || value === null) {
    throw new Error("Imported JSON must be a level object.");
  }

  const candidate = value as Partial<LevelData>;
  const gridSize = candidate.gridSize;
  if (
    !gridSize ||
    !Number.isFinite(gridSize.x) ||
    !Number.isFinite(gridSize.y)
  ) {
    throw new Error("Imported level is missing gridSize.x and gridSize.y.");
  }

  if (!Array.isArray(candidate.arrows)) {
    throw new Error("Imported level is missing an arrows array.");
  }

  const gridX = Math.max(2, Math.min(MAX_GRID_SIZE, Math.floor(gridSize.x)));
  const gridY = Math.max(2, Math.min(MAX_GRID_SIZE, Math.floor(gridSize.y)));

  return {
    id: Number.isFinite(candidate.id) ? Number(candidate.id) : 1,
    name:
      typeof candidate.name === "string" ? candidate.name : "Imported Level",
    gridSize: { x: gridX, y: gridY },
    arrows: candidate.arrows.map((arrow, index) => {
      if (
        !arrow ||
        !Array.isArray(arrow.waypoints) ||
        !isGameDirection(arrow.headDirection)
      ) {
        throw new Error(`Arrow #${index + 1} is missing valid data.`);
      }

      return {
        waypoints: arrow.waypoints.map((waypoint) => ({
          x: Number(waypoint.x),
          y: Number(waypoint.y),
        })),
        headDirection: arrow.headDirection,
        color: Number(arrow.color),
      };
    }),
  };
}

// ── arrowhead SVG ─────────────────────────────────────────────────────────────

function arrowHeadPoints(
  dir: GameDirection,
  cx: number,
  cy: number,
  s: number,
): string {
  const h = s * 0.45,
    w = s * 0.3;
  switch (dir) {
    case "up":
      return `${cx},${cy - h} ${cx - w},${cy + h * 0.4} ${cx + w},${cy + h * 0.4}`;
    case "down":
      return `${cx},${cy + h} ${cx - w},${cy - h * 0.4} ${cx + w},${cy - h * 0.4}`;
    case "left":
      return `${cx - h},${cy} ${cx + h * 0.4},${cy - w} ${cx + h * 0.4},${cy + w}`;
    case "right":
      return `${cx + h},${cy} ${cx - h * 0.4},${cy - w} ${cx - h * 0.4},${cy + w}`;
  }
}

// ── component ─────────────────────────────────────────────────────────────────

export default function LevelEditorPage() {
  const [levelId, setLevelId] = useState(1);
  const [levelName, setLevelName] = useState("My Level");
  const [cols, setCols] = useState(6);
  const [rows, setRows] = useState(6);
  const [colsInput, setColsInput] = useState("6");
  const [rowsInput, setRowsInput] = useState("6");

  const [arrows, setArrows] = useState<EditorArrow[]>([]);
  // `path` = current drawing in editor coords, TAIL→HEAD, path[last] = HEAD
  const [path, setPath] = useState<GridPos[]>([]);
  const [color, setColor] = useState(PALETTE[0]);
  const [dir, setDir] = useState<GameDirection>("up");
  const [copied, setCopied] = useState(false);
  const [showJSON, setShowJSON] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [isFetchingGeneratedLevel, setIsFetchingGeneratedLevel] =
    useState(false);
  const [generatedLevelError, setGeneratedLevelError] = useState<string | null>(
    null,
  );
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [isPlayPreviewOpen, setIsPlayPreviewOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const pendingPlayLevelRef = useRef<LevelData | null>(null);
  const isPlaySceneReadyRef = useRef(false);
  const playPreviewRef = useRef<PhaserGameHandle>(null);

  const cellSize = Math.max(
    26,
    Math.min(Math.floor(MAX_GRID_PX / Math.max(cols, rows)), 80),
  );
  const gridW = cols * cellSize;
  const gridH = rows * cellSize;

  // ── derived sets ─────────────────────────────────────────────────────────

  const occupiedSet = useMemo(() => {
    const s = new Set<string>();
    arrows.forEach((a) => a.path.forEach((wp) => s.add(`${wp.x},${wp.y}`)));
    return s;
  }, [arrows]);

  const pathSet = useMemo(
    () => new Set(path.map((wp) => `${wp.x},${wp.y}`)),
    [path],
  );

  const occupiedColorMap = useMemo(() => {
    const m = new Map<string, string>();
    arrows.forEach((a) =>
      a.path.forEach((wp) => m.set(`${wp.x},${wp.y}`, a.colorHex)),
    );
    return m;
  }, [arrows]);

  const occupiedArrowIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    arrows.forEach((arrow, index) =>
      arrow.path.forEach((wp) => m.set(`${wp.x},${wp.y}`, index)),
    );
    return m;
  }, [arrows]);

  // HEAD = last cell; TAIL = first cell
  const headCell = path.length > 0 ? path[path.length - 1] : null;
  const tailCell = path.length > 0 ? path[0] : null;

  // Auto-update direction from path shape
  useEffect(() => {
    const inferred = inferDir(path);
    if (inferred) setDir(inferred);
  }, [path]);

  // ── cell click ────────────────────────────────────────────────────────────
  //
  // UX:  every click advances the HEAD to the clicked cell.
  //      • first click  → start the path (that cell is both tail and head)
  //      • subsequent   → HEAD moves to the clicked cell; old head becomes body
  //      • same row/col → intermediate cells are auto-filled
  //      • clicking any existing path cell → trims path back to that cell

  const handleCellClick = useCallback(
    (col: number, row: number) => {
      const key = `${col},${row}`;
      if (occupiedSet.has(key)) return; // already claimed by finished arrow

      if (path.length === 0) {
        setPath([{ x: col, y: row }]);
        return;
      }

      const last = path[path.length - 1];
      if (last.x === col && last.y === row) return; // no-op

      // Clicking an existing path cell: trim back to it (it becomes the new HEAD)
      const existIdx = path.findIndex((wp) => wp.x === col && wp.y === row);
      if (existIdx !== -1) {
        setPath(path.slice(0, existIdx + 1));
        return;
      }

      // Build intermediate cells for straight-line clicks
      const between = fillBetween(last, { x: col, y: row });
      const canFill = between.every(
        (p) =>
          !occupiedSet.has(`${p.x},${p.y}`) && !pathSet.has(`${p.x},${p.y}`),
      );

      if (between.length > 0 && canFill) {
        setPath((prev) => [...prev, ...between, { x: col, y: row }]);
      } else {
        setPath((prev) => [...prev, { x: col, y: row }]);
      }
    },
    [path, pathSet, occupiedSet],
  );

  // ── commit / delete ───────────────────────────────────────────────────────

  const commitArrow = useCallback(() => {
    if (path.length < 2) return;
    setArrows((prev) => [
      ...prev,
      { path: [...path], headDirection: dir, colorHex: color },
    ]);
    setPath([]);
    setColor(PALETTE[(PALETTE.indexOf(color) + 1) % PALETTE.length]);
  }, [path, dir, color]);

  const deleteArrow = useCallback(
    (idx: number) => setArrows((prev) => prev.filter((_, i) => i !== idx)),
    [],
  );

  const handleCellContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>, col: number, row: number) => {
      const arrowIndex = occupiedArrowIndexMap.get(`${col},${row}`);
      if (arrowIndex === undefined) return;

      event.preventDefault();
      deleteArrow(arrowIndex);
    },
    [deleteArrow, occupiedArrowIndexMap],
  );

  const clearAll = useCallback(() => {
    setArrows([]);
    setPath([]);
  }, []);

  const applyLevelData = useCallback((level: LevelData) => {
    const nextCols = level.gridSize.x;
    const nextRows = level.gridSize.y;
    setLevelId(level.id);
    setLevelName(level.name);
    setCols(nextCols);
    setRows(nextRows);
    setColsInput(String(nextCols));
    setRowsInput(String(nextRows));
    setPath([]);
    setArrows(
      level.arrows.map((arrow) => ({
        path: toEditorWaypoints(arrow.waypoints, nextRows),
        headDirection: arrow.headDirection,
        colorHex: numToHex(arrow.color),
      })),
    );
  }, []);

  const applyGrid = useCallback(() => {
    const c = Math.max(2, Math.min(MAX_GRID_SIZE, parseInt(colsInput) || cols));
    const r = Math.max(2, Math.min(MAX_GRID_SIZE, parseInt(rowsInput) || rows));
    setCols(c);
    setRows(r);
    setColsInput(String(c));
    setRowsInput(String(r));
    setArrows((prev) =>
      prev.filter((a) => a.path.every((wp) => wp.x < c && wp.y < r)),
    );
    setPath((prev) => prev.filter((wp) => wp.x < c && wp.y < r));
  }, [colsInput, rowsInput, cols, rows]);

  const fetchGeneratedLevel = useCallback(async () => {
    setIsFetchingGeneratedLevel(true);
    setGeneratedLevelError(null);

    try {
      const gridX = Math.max(
        2,
        Math.min(MAX_GRID_SIZE, parseInt(colsInput) || cols),
      );
      const gridY = Math.max(
        2,
        Math.min(MAX_GRID_SIZE, parseInt(rowsInput) || rows),
      );
      const response = await gameApiClient.generateBoard({ gridX, gridY });
      const board = response.data;
      if (!response.success || !board) {
        throw new Error(response.message ?? "Failed to fetch generated level.");
      }

      applyLevelData({
        id: levelId,
        name: levelName,
        gridSize: board.gridSize,
        arrows: board.arrows,
      });
    } catch (error) {
      setGeneratedLevelError(
        error instanceof Error
          ? error.message
          : "Failed to fetch generated level.",
      );
    } finally {
      setIsFetchingGeneratedLevel(false);
    }
  }, [applyLevelData, cols, colsInput, levelId, levelName, rows, rowsInput]);

  // ── SVG helpers ───────────────────────────────────────────────────────────

  const cc = (x: number, y: number) => ({
    cx: x * cellSize + cellSize / 2,
    cy: y * cellSize + cellSize / 2,
  });

  const pts = (wps: GridPos[]) =>
    wps
      .map((wp) => {
        const { cx, cy } = cc(wp.x, wp.y);
        return `${cx},${cy}`;
      })
      .join(" ");

  // ── JSON export (applies Y-flip for game coords) ──────────────────────────

  const levelData: LevelData = useMemo(
    () => ({
      id: levelId,
      name: levelName,
      gridSize: { x: cols, y: rows },
      arrows: arrows.map((a) => ({
        waypoints: toGameWaypoints(a.path, rows), // flip Y here
        headDirection: a.headDirection,
        color: hexToNum(a.colorHex),
      })),
    }),
    [arrows, cols, levelId, levelName, rows],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const draft = await storage.get<LevelData>(LEVEL_EDITOR_DRAFT_KEY);

      if (cancelled) return;
      try {
        if (draft) {
          applyLevelData(parseImportedLevel(draft));
        }
      } catch {
        storage.remove(LEVEL_EDITOR_DRAFT_KEY);
      }
      setHasLoadedDraft(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [applyLevelData]);

  useEffect(() => {
    if (!hasLoadedDraft) return;
    void storage.set(LEVEL_EDITOR_DRAFT_KEY, levelData);
  }, [hasLoadedDraft, levelData]);

  const jsonOutput = JSON.stringify(levelData, null, 2);

  const copyJSON = async () => {
    await navigator.clipboard.writeText(jsonOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const dispatchPlayableLevel = useCallback((level: LevelData) => {
    window.dispatchEvent(
      new CustomEvent(GAME_EVENTS.CMD_LOAD_LEVEL_DATA, { detail: level }),
    );
  }, []);

  const playCurrentLevel = useCallback(() => {
    pendingPlayLevelRef.current = levelData;

    if (!isPlayPreviewOpen) {
      setIsPlayPreviewOpen(true);
      return;
    }

    if (isPlaySceneReadyRef.current) {
      dispatchPlayableLevel(levelData);
    }
  }, [dispatchPlayableLevel, isPlayPreviewOpen, levelData]);

  const newLevel = useCallback(() => {
    storage.remove(LEVEL_EDITOR_DRAFT_KEY);
    setLevelId(1);
    setLevelName("My Level");
    setCols(6);
    setRows(6);
    setColsInput("6");
    setRowsInput("6");
    setArrows([]);
    setPath([]);
    setIsPlayPreviewOpen(false);
    pendingPlayLevelRef.current = null;
    isPlaySceneReadyRef.current = false;
    setImportText("");
    setImportError(null);
    setGeneratedLevelError(null);
  }, []);

  const importLevelFromText = useCallback(
    async (rawJson: string) => {
      setImportError(null);
      try {
        const parsedLevel = parseImportedLevel(JSON.parse(rawJson));
        applyLevelData(parsedLevel);
        await storage.set(LEVEL_EDITOR_DRAFT_KEY, parsedLevel);
        setImportText("");
      } catch (error) {
        setImportError(
          error instanceof Error ? error.message : "Failed to import level.",
        );
      }
    },
    [applyLevelData],
  );

  const importLevelFromFile = useCallback(
    async (file: File | null) => {
      if (!file) return;
      await importLevelFromText(await file.text());
    },
    [importLevelFromText],
  );

  useEffect(() => {
    if (!isPlayPreviewOpen) return;

    const handleSceneReady = () => {
      isPlaySceneReadyRef.current = true;
      if (pendingPlayLevelRef.current) {
        dispatchPlayableLevel(pendingPlayLevelRef.current);
      }
    };

    window.addEventListener(GAME_EVENTS.SCENE_READY, handleSceneReady);
    return () => {
      window.removeEventListener(GAME_EVENTS.SCENE_READY, handleSceneReady);
    };
  }, [dispatchPlayableLevel, isPlayPreviewOpen]);

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <main className="level-editor-page">
      {/* Header */}
      <header className="level-editor-header">
        <div className="level-editor-header__brand">
          <span className="level-editor-header__icon">🗺️</span>
          <h1 className="level-editor-title">Level Editor</h1>
          <span className="level-editor-badge">BETA</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={newLevel}
            style={{
              padding: "7px 11px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#374151",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            New Level
          </button>
          <Link to="/" className="level-editor-back-link">
            ← Back to Game
          </Link>
        </div>
      </header>

      {/* Body */}
      <div className="level-editor-body">
        {/* ── Grid ──────────────────────────────────────────────────────── */}
        <div className="level-editor-grid-card">
          {/* column labels */}
          <div className="level-editor-column-labels">
            {Array.from({ length: cols }, (_, c) => (
              <div
                key={c}
                className="level-editor-axis-label level-editor-column-label"
                style={{ width: cellSize }}
              >
                {c}
              </div>
            ))}
          </div>

          <div className="level-editor-row-with-labels">
            {/* row labels */}
            <div className="level-editor-row-labels">
              {Array.from({ length: rows }, (_, r) => (
                <div
                  key={r}
                  className="level-editor-axis-label level-editor-row-label"
                  style={{ height: cellSize }}
                >
                  {r}
                </div>
              ))}
            </div>

            {/* Grid canvas */}
            <div
              className="level-editor-grid-canvas"
              style={{
                width: gridW,
                height: gridH,
              }}
            >
              {/* Cells */}
              {Array.from({ length: rows }, (_, row) =>
                Array.from({ length: cols }, (_, col) => {
                  const key = `${col},${row}`;
                  const finishedColor = occupiedColorMap.get(key);
                  const inPath = pathSet.has(key);
                  const isHead = headCell?.x === col && headCell?.y === row;
                  const isTail =
                    tailCell?.x === col &&
                    tailCell?.y === row &&
                    path.length > 1;
                  const isHov = hovered === key;

                  let bg = "#f9fafb";
                  if (finishedColor) bg = finishedColor + "cc";
                  else if (inPath) bg = color + "bb";
                  else if (isHov) bg = color + "28";

                  return (
                    <div
                      key={key}
                      onClick={() => handleCellClick(col, row)}
                      onContextMenu={(event) =>
                        handleCellContextMenu(event, col, row)
                      }
                      onMouseEnter={() => setHovered(key)}
                      onMouseLeave={() => setHovered(null)}
                      className={`level-editor-cell ${
                        finishedColor
                          ? "level-editor-cell--blocked"
                          : "level-editor-cell--editable"
                      }`}
                      style={{
                        left: col * cellSize + 1,
                        top: row * cellSize + 1,
                        width: cellSize - 2,
                        height: cellSize - 2,
                        backgroundColor: bg,
                        border: isHead
                          ? `2.5px solid ${color}`
                          : "1px solid rgba(0,0,0,0.06)",
                        fontSize: cellSize > 36 ? 11 : 8,
                      }}
                    >
                      {isHead && cellSize >= 28
                        ? "H"
                        : isTail && cellSize >= 28
                          ? "T"
                          : null}
                    </div>
                  );
                }),
              )}

              {/* SVG overlay: paths + arrowheads */}
              <svg
                className="level-editor-svg-overlay"
                width={gridW}
                height={gridH}
              >
                {/* Committed arrows */}
                {arrows.map((arrow, idx) => {
                  const head = arrow.path[arrow.path.length - 1];
                  const { cx, cy } = cc(head.x, head.y);
                  return (
                    <g key={idx}>
                      <polyline
                        points={pts(arrow.path)}
                        stroke={arrow.colorHex}
                        strokeWidth={Math.max(2, cellSize * 0.12)}
                        fill="none"
                        strokeOpacity={0.8}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      <polygon
                        points={arrowHeadPoints(
                          arrow.headDirection,
                          cx,
                          cy,
                          cellSize * 0.62,
                        )}
                        fill={arrow.colorHex}
                        opacity={0.95}
                      />
                    </g>
                  );
                })}

                {/* Current path */}
                {path.length > 1 && (
                  <polyline
                    points={pts(path)}
                    stroke={color}
                    strokeWidth={Math.max(2, cellSize * 0.12)}
                    fill="none"
                    strokeDasharray="7 3"
                    strokeOpacity={0.9}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}

                {/* Direction preview at HEAD */}
                {headCell &&
                  (() => {
                    const { cx, cy } = cc(headCell.x, headCell.y);
                    return (
                      <polygon
                        points={arrowHeadPoints(dir, cx, cy, cellSize * 0.58)}
                        fill={color}
                        opacity={0.85}
                      />
                    );
                  })()}
              </svg>
            </div>
          </div>

          {/* Status bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "#6b7280",
            }}
          >
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: path.length > 0 ? color : "#d1d5db",
                flexShrink: 0,
              }}
            />
            {path.length === 0
              ? "Click any cell to place the first point (becomes TAIL)"
              : path.length === 1
                ? "Click another cell — it becomes the new HEAD (auto-fills straights)"
                : `${path.length} cells — H=head  T=tail — click existing cell to trim`}
          </div>
        </div>

        {isPlayPreviewOpen && (
          <div
            className="level-editor-grid-card"
            style={{ width: "min(520px, 100%)" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div className="level-editor-label">Play Current Level</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>
                  Current editor level
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={playCurrentLevel}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    color: "#374151",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Replay
                </button>
                <button
                  onClick={() => playPreviewRef.current?.autoplay()}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: "1px solid #111827",
                    background: "#111827",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Autoplay
                </button>
              </div>
            </div>
            <div
              style={{
                height: 420,
                overflow: "hidden",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#111827",
              }}
            >
              <PhaserGame ref={playPreviewRef} />
            </div>
          </div>
        )}

        {/* ── Controls ──────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            flex: 1,
            minWidth: 260,
            maxWidth: 340,
          }}
        >
          {/* Level settings */}
          <div className="level-editor-section">
            <div className="level-editor-label">Level Settings</div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: "0 0 68px" }}>
                <div
                  style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}
                >
                  ID
                </div>
                <input
                  type="number"
                  min={1}
                  value={levelId}
                  onChange={(e) =>
                    setLevelId(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="level-editor-input"
                />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}
                >
                  Name
                </div>
                <input
                  type="text"
                  value={levelName}
                  onChange={(e) => setLevelName(e.target.value)}
                  placeholder="Level name"
                  className="level-editor-input"
                />
              </div>
            </div>
          </div>

          {/* Generate from API */}
          <div className="level-editor-section">
            <div className="level-editor-label">Generate</div>
            <button
              onClick={fetchGeneratedLevel}
              disabled={isFetchingGeneratedLevel}
              style={{
                padding: "9px 12px",
                borderRadius: 8,
                background: isFetchingGeneratedLevel ? "#e5e7eb" : "#111827",
                border: "none",
                color: isFetchingGeneratedLevel ? "#9ca3af" : "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor: isFetchingGeneratedLevel ? "not-allowed" : "pointer",
              }}
            >
              {isFetchingGeneratedLevel
                ? "Fetching..."
                : "Fetch Generated Level"}
            </button>
            {generatedLevelError && (
              <Alert
                variant="error"
                title="Generation Failed"
                description={generatedLevelError}
                onClose={() => setGeneratedLevelError(null)}
              />
            )}
          </div>

          {/* Play test */}
          <div className="level-editor-section">
            <div className="level-editor-label">Play Test</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={playCurrentLevel}
                disabled={arrows.length === 0}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: 8,
                  background: arrows.length === 0 ? "#e5e7eb" : "#16a34a",
                  border: "none",
                  color: arrows.length === 0 ? "#9ca3af" : "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: arrows.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                Play Current Level
              </button>
              <button
                onClick={() => playPreviewRef.current?.autoplay()}
                disabled={!isPlayPreviewOpen}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: 8,
                  background: isPlayPreviewOpen ? "#111827" : "#e5e7eb",
                  border: "none",
                  color: isPlayPreviewOpen ? "#fff" : "#9ca3af",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: isPlayPreviewOpen ? "pointer" : "not-allowed",
                }}
              >
                Autoplay
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              Loads the current editor level in the preview.
            </div>
          </div>

          {/* Grid size */}
          <div className="level-editor-section">
            <div className="level-editor-label">Grid Size</div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}
                >
                  Cols
                </div>
                <input
                  type="number"
                  min={2}
                  max={MAX_GRID_SIZE}
                  value={colsInput}
                  onChange={(e) => setColsInput(e.target.value)}
                  onBlur={applyGrid}
                  onKeyDown={(e) => e.key === "Enter" && applyGrid()}
                  className="level-editor-input"
                />
              </div>
              <div
                style={{ paddingBottom: 8, color: "#9ca3af", fontWeight: 700 }}
              >
                ×
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}
                >
                  Rows
                </div>
                <input
                  type="number"
                  min={2}
                  max={MAX_GRID_SIZE}
                  value={rowsInput}
                  onChange={(e) => setRowsInput(e.target.value)}
                  onBlur={applyGrid}
                  onKeyDown={(e) => e.key === "Enter" && applyGrid()}
                  className="level-editor-input"
                />
              </div>
              <button
                onClick={applyGrid}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: "#6366f1",
                  border: "none",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                  height: 34,
                  flexShrink: 0,
                }}
              >
                Apply
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              {cols}×{rows} — resizing removes out-of-bounds arrows
            </div>
          </div>

          {/* Current arrow */}
          <div className="level-editor-section">
            <div className="level-editor-label">Current Arrow</div>

            {/* Color */}
            <div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                Color
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: c,
                      border: "none",
                      cursor: "pointer",
                      boxShadow:
                        color === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : "none",
                      transition: "box-shadow 0.15s",
                    }}
                    title={c}
                  />
                ))}
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  title="Custom"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "1.5px dashed #d1d5db",
                    cursor: "pointer",
                    padding: 1,
                    background: "#fff",
                  }}
                />
              </div>
            </div>

            {/* Head direction */}
            <div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                Head Direction
                <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: 6 }}>
                  (auto-set from path — override if needed)
                </span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {DIRS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDir(d.value)}
                    style={{
                      flex: 1,
                      padding: "7px 4px",
                      borderRadius: 8,
                      border:
                        dir === d.value
                          ? "2px solid #6366f1"
                          : "1.5px solid #e5e7eb",
                      background: dir === d.value ? "#eef2ff" : "#fff",
                      color: dir === d.value ? "#6366f1" : "#374151",
                      fontWeight: 700,
                      fontSize: 16,
                      cursor: "pointer",
                      transition: "all 0.12s",
                    }}
                    title={d.label}
                  >
                    {d.symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setPath((p) => p.slice(0, -1))}
                disabled={path.length === 0}
                style={{
                  flex: 1,
                  padding: "7px 4px",
                  borderRadius: 8,
                  border: "1.5px solid #e5e7eb",
                  background: "#fff",
                  color: "#374151",
                  fontWeight: 500,
                  fontSize: 12,
                  cursor: path.length === 0 ? "not-allowed" : "pointer",
                  opacity: path.length === 0 ? 0.4 : 1,
                }}
              >
                ↩ Undo
              </button>
              <button
                onClick={() => setPath([])}
                disabled={path.length === 0}
                style={{
                  flex: 1,
                  padding: "7px 4px",
                  borderRadius: 8,
                  border: "1.5px solid #e5e7eb",
                  background: "#fff",
                  color: "#374151",
                  fontWeight: 500,
                  fontSize: 12,
                  cursor: path.length === 0 ? "not-allowed" : "pointer",
                  opacity: path.length === 0 ? 0.4 : 1,
                }}
              >
                ✕ Clear
              </button>
              <button
                onClick={commitArrow}
                disabled={path.length < 2}
                style={{
                  flex: 2,
                  padding: "7px 8px",
                  borderRadius: 8,
                  background: path.length >= 2 ? "#6366f1" : "#e5e7eb",
                  border: "none",
                  color: path.length >= 2 ? "#fff" : "#9ca3af",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: path.length < 2 ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                }}
              >
                + Add Arrow
              </button>
            </div>
          </div>

          {/* Arrow list */}
          <div className="level-editor-section">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div className="level-editor-label">Arrows ({arrows.length})</div>
              {arrows.length > 0 && (
                <button
                  onClick={clearAll}
                  style={{
                    fontSize: 11,
                    color: "#ef4444",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Clear All
                </button>
              )}
            </div>
            {arrows.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: "#9ca3af",
                  textAlign: "center",
                  padding: "8px 0",
                }}
              >
                No arrows yet — draw on the grid and click + Add Arrow
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  maxHeight: 200,
                  overflowY: "auto",
                }}
              >
                {arrows.map((arrow, idx) => {
                  const dirSym =
                    DIRS.find((d) => d.value === arrow.headDirection)?.symbol ??
                    "?";
                  const tail = arrow.path[0];
                  const head = arrow.path[arrow.path.length - 1];
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 8px",
                        borderRadius: 8,
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: arrow.colorHex,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, fontSize: 12, color: "#374151" }}>
                        <span style={{ fontWeight: 600 }}>#{idx + 1}</span> T(
                        {tail.x},{tail.y})→H({head.x},{head.y})
                        <span style={{ color: "#9ca3af" }}>
                          {" "}
                          {arrow.path.length}pts {dirSym}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteArrow(idx)}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          border: "none",
                          background: "#fee2e2",
                          color: "#ef4444",
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Import */}
          <div className="level-editor-section">
            <div className="level-editor-label">Import Level</div>
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                void importLevelFromFile(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
              className="level-editor-input"
            />
            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder="Paste level JSON"
              style={{
                minHeight: 96,
                resize: "vertical",
                padding: 8,
                border: "1.5px solid #e5e7eb",
                borderRadius: 8,
                color: "#111827",
                fontSize: 12,
                lineHeight: 1.45,
                outline: "none",
              }}
            />
            <button
              onClick={() => void importLevelFromText(importText)}
              disabled={importText.trim().length === 0}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                background:
                  importText.trim().length === 0 ? "#e5e7eb" : "#6366f1",
                border: "none",
                color: importText.trim().length === 0 ? "#9ca3af" : "#fff",
                fontWeight: 700,
                fontSize: 13,
                cursor:
                  importText.trim().length === 0 ? "not-allowed" : "pointer",
              }}
            >
              Import Pasted JSON
            </button>
            {importError && (
              <Alert
                variant="error"
                title="Import Failed"
                description={importError}
                onClose={() => setImportError(null)}
              />
            )}
          </div>

          {/* JSON output */}
          <div className="level-editor-section">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div className="level-editor-label">JSON Output</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setShowJSON((v) => !v)}
                  style={{
                    fontSize: 11,
                    color: "#6366f1",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {showJSON ? "Hide" : "Show"}
                </button>
                <button
                  onClick={copyJSON}
                  style={{
                    fontSize: 11,
                    padding: "3px 10px",
                    borderRadius: 6,
                    background: copied ? "#dcfce7" : "#eef2ff",
                    color: copied ? "#16a34a" : "#6366f1",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                    transition: "all 0.15s",
                  }}
                >
                  {copied ? "✓ Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(
                [
                  ["Grid", `${cols}×${rows}`],
                  ["Arrows", arrows.length],
                  ["Total pts", arrows.reduce((s, a) => s + a.path.length, 0)],
                ] as const
              ).map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    fontSize: 11,
                    background: "#f3f4f6",
                    borderRadius: 6,
                    padding: "3px 8px",
                    color: "#374151",
                  }}
                >
                  <span style={{ color: "#9ca3af" }}>{k}: </span>
                  <span style={{ fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                fontSize: 11,
                color: "#6b7280",
                background: "#f9fafb",
                borderRadius: 8,
                padding: "7px 10px",
                border: "1px solid #e5e7eb",
              }}
            >
              📐 Export automatically flips Y-coordinates to match the
              game&apos;s coordinate system (y=0 at bottom). What you see on the
              grid is what you get in the game.
            </div>

            {showJSON && (
              <pre
                style={{
                  margin: 0,
                  padding: 10,
                  borderRadius: 8,
                  background: "#111827",
                  color: "#d1fae5",
                  fontSize: 10,
                  lineHeight: 1.6,
                  overflowX: "auto",
                  maxHeight: 320,
                  overflowY: "auto",
                  border: "1px solid #374151",
                }}
              >
                {jsonOutput}
              </pre>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
