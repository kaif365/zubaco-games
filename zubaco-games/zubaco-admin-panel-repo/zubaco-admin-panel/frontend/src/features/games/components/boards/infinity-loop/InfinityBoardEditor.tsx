"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InfinityColorPicker } from "./InfinityColorPicker";
import { InfinityFormRow } from "./InfinityFormRow";
import { InfinityLoopGrid } from "./InfinityLoopGrid";
import { InfinityRandomizedPuzzleEditor } from "./InfinityRandomizedPuzzleEditor";
import { INFINITY_TILE_RENDER_TYPE } from "./InfinityLoopGrid";
import type {
  InfinityBoardSettings,
  InfinityPuzzlePair,
  InfinityTileCell,
} from "@/types/games/infinity-loop/infinity-loop-board-editor";
import { Check, Trash2 } from "lucide-react";
import { useToast } from "@/providers/ToastProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GRID_SIZES = Array.from({ length: 6 }, (_, index) => index + 3);

const rotateGridCell = (
  grid: InfinityTileCell[][],
  x: number,
  y: number,
): InfinityTileCell[][] =>
  grid.map((row) =>
    row.map((cell) => {
      if (cell.x !== x || cell.y !== y) return cell;
      const rotation = (cell.rotation + 1) % 4;
      return {
        ...cell,
        rotation,
        isCorrect: rotation === cell.correctRotation,
      };
    }),
  );

interface InfinityBoardEditorProps {
  readonly boards: InfinityBoardSettings[];
  readonly loadingBoards: boolean;
  readonly loadingPairs: boolean;
  readonly savingBoardId: string | null;
  readonly onCreateBoard: () => Promise<string>;
  readonly onUpdateBoard: (
    boardId: string,
    patch: Partial<InfinityBoardSettings>,
  ) => void;
  readonly onDeleteBoard: (boardId: string) => void;
  readonly onFetchPairs: (
    rows: number,
    columns: number,
    generationLimit: number,
  ) => Promise<InfinityPuzzlePair[]>;
  readonly onSaveOrUpdatePuzzle: (
    boardId: string,
    selectedPuzzlePairId: string,
    pairs: InfinityPuzzlePair[],
  ) => Promise<boolean>;
  readonly onSaved?: () => void;
  readonly mode?: "default" | "create";
  readonly levelSelect?: {
    value: string;
    onValueChange: (value: string) => void;
    disabled: boolean;
    items: { id: string; name: string }[];
  };
}

export const InfinityBoardEditor = ({
  boards,
  loadingBoards,
  loadingPairs,
  savingBoardId,
  onCreateBoard,
  onUpdateBoard,
  onDeleteBoard,
  onFetchPairs,
  onSaveOrUpdatePuzzle,
  onSaved,
  mode = "default",
  levelSelect,
}: InfinityBoardEditorProps) => {
  const { toast } = useToast();
  const [activeBoardId, setActiveBoardId] = useState("");
  const [selectedPairId, setSelectedPairId] = useState("");
  const [editorPairId, setEditorPairId] = useState("");
  const [editorGrid, setEditorGrid] = useState<InfinityTileCell[][]>([]);
  const editorGridRef = useRef<InfinityTileCell[][]>([]);
  const [hasRequestedPairs, setHasRequestedPairs] = useState(false);
  const [localPairs, setLocalPairs] = useState<InfinityPuzzlePair[]>([]);
  const [generationLimitText, setGenerationLimitText] = useState("1");
  const [isRedirecting, setIsRedirecting] = useState(false);

  const activeBoard =
    boards.find((board) => board.id === activeBoardId) ?? null;
  const pairsToRender = hasRequestedPairs ? localPairs : [];

  const selected = selectedPairId || activeBoard?.selectedPuzzlePairId || "";
  const validGrid = Boolean(
    activeBoard &&
    activeBoard.rows >= 3 &&
    activeBoard.rows <= 8 &&
    activeBoard.columns >= 3 &&
    activeBoard.columns <= 8 &&
    activeBoard.rows === activeBoard.columns,
  );
  const canSave = Boolean(activeBoard && validGrid && selected);

  const rotateTileInEditor = (x: number, y: number) => {
    setEditorGrid((prev) => {
      const next = rotateGridCell(prev, x, y);
      editorGridRef.current = next;
      return next;
    });
  };

  const editedPair = pairsToRender.find((pair) => pair.id === editorPairId);

  const activateBoard = useCallback(
    (nextBoardId: string) => {
      const nextBoard =
        boards.find((board) => board.id === nextBoardId) ?? null;
      setActiveBoardId(nextBoardId);
      setHasRequestedPairs(false);
      setSelectedPairId("");
      setIsRedirecting(false);
      setGenerationLimitText(String(nextBoard?.generationLimit ?? 1));
    },
    [boards],
  );

  // In create mode, ensure we always have an active draft board and hide the board list UI.
  useEffect(() => {
    if (mode !== "create") return;
    if (activeBoardId) return;
    void onCreateBoard().then((createdId) => activateBoard(createdId));
  }, [activeBoardId, activateBoard, mode, onCreateBoard]);

  useEffect(() => {
    editorGridRef.current = editorGrid;
  }, [editorGrid]);

  const showBoardsList = mode !== "create";

  return (
    <section className="grid gap-5">
      {showBoardsList ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <Button
            onClick={() => {
              void onCreateBoard().then((createdId) =>
                activateBoard(createdId),
              );
            }}
          >
            Create Board
          </Button>
        </div>
      ) : null}

      {loadingBoards && showBoardsList ? (
        <p className="text-sm text-slate-600">Loading boards...</p>
      ) : null}

      {showBoardsList
        ? boards.map((board) => (
            <article
              key={board.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm"
            >
              <p className="font-semibold text-slate-900">{board.name}</p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Edit ${board.name}`}
                  onClick={() => {
                    activateBoard(board.id);
                  }}
                >
                  ✎
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDeleteBoard(board.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete</span>
                </Button>
              </div>
            </article>
          ))
        : null}

      {activeBoard ? (
        <article className="grid gap-5 rounded-2xl border border-white/10 bg-[#453922] p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <InfinityFormRow label="Grid Size">
              <Select
                value={String(activeBoard.rows)}
                onValueChange={(value) => {
                  const gridSize = Number(value);
                  onUpdateBoard(activeBoard.id, {
                    rows: gridSize,
                    columns: gridSize,
                  });
                  setHasRequestedPairs(false);
                  setSelectedPairId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grid size" />
                </SelectTrigger>
                <SelectContent>
                  {GRID_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}x{size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </InfinityFormRow>
            {levelSelect ? (
              <InfinityFormRow label="Level">
                <Select
                  value={levelSelect.value}
                  onValueChange={levelSelect.onValueChange}
                  disabled={levelSelect.disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {levelSelect.items.map((item) => (
                      <SelectItem key={item.id} value={item.name}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </InfinityFormRow>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-1">
            <InfinityFormRow label="Board Name">
              <Input
                value={activeBoard.name}
                onChange={(event) =>
                  onUpdateBoard(activeBoard.id, { name: event.target.value })
                }
              />
            </InfinityFormRow>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <InfinityFormRow label="Generation Limit">
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                value={generationLimitText}
                onChange={(event) => {
                  const raw = event.target.value;
                  if (raw === "" || /^\d+$/.test(raw)) {
                    setGenerationLimitText(raw);
                  }
                }}
                onBlur={() => {
                  const raw = generationLimitText.trim();
                  const parsed =
                    raw === "" ? 1 : Number.parseInt(generationLimitText, 10);
                  const clamped = Number.isFinite(parsed)
                    ? Math.min(Math.max(parsed, 1), 10)
                    : 1;
                  setGenerationLimitText(String(clamped));
                  onUpdateBoard(activeBoard.id, { generationLimit: clamped });
                }}
              />
              <span className="text-xs text-white/70">
                Limit must be between 1 and 10.
              </span>
            </InfinityFormRow>
            <InfinityFormRow
              label="Board Color"
              helperText="Pick a color or enter a custom 6-digit hex value."
            >
              <InfinityColorPicker
                value={activeBoard.color || "#7dd3fc"}
                onChange={(color) => onUpdateBoard(activeBoard.id, { color })}
              />
            </InfinityFormRow>
          </div>

          {pairsToRender.length > 0 ? (
            <div className="grid gap-5">
              <h3 className="text-base font-semibold text-white">
                Select one row: Complete + Customizable Randomized
              </h3>
              {pairsToRender.map((pair) => (
                <div
                  key={pair.id}
                  className={[
                    "grid gap-3 rounded-xl border p-3",
                    selected === pair.id
                      ? "border-amber-400/70 bg-black/20"
                      : "border-white/10 bg-black/10",
                  ].join(" ")}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedPairId(pair.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedPairId(pair.id);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "grid h-5 w-5 place-items-center rounded-full border",
                          selected === pair.id
                            ? "border-amber-400 bg-amber-400/15"
                            : "border-white/30 bg-transparent",
                        ].join(" ")}
                        aria-hidden="true"
                      >
                        {selected === pair.id ? (
                          <Check className="h-3.5 w-3.5 text-amber-300" />
                        ) : null}
                      </span>
                      <span className="font-semibold text-white">
                        {pair.label}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        // Don't change the selected pair when opening the editor.
                        // Selection should be from the card click.
                        e.stopPropagation();
                        setEditorPairId(pair.id);
                        setEditorGrid(pair.randomizedGrid);
                        editorGridRef.current = pair.randomizedGrid;
                      }}
                    >
                      Edit Randomized
                    </Button>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm font-medium text-white/80">
                        Complete Shape (read only)
                      </p>
                      <InfinityLoopGrid
                        grid={pair.completeGrid}
                        className="max-w-120"
                        tileType={INFINITY_TILE_RENDER_TYPE.FILLED}
                      />
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-white/80">
                        Randomized Shape
                      </p>
                      <InfinityLoopGrid
                        grid={pair.randomizedGrid}
                        className="max-w-120"
                        tileType={INFINITY_TILE_RENDER_TYPE.FILLED}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <Button
              variant="outline"
              onClick={() => {
                void onFetchPairs(
                  activeBoard.rows,
                  activeBoard.columns,
                  activeBoard.generationLimit,
                ).then((pairs) => {
                  setHasRequestedPairs(true);
                  setLocalPairs(pairs);
                  setSelectedPairId("");
                });
              }}
              disabled={loadingPairs}
            >
              {loadingPairs ? "Generating..." : "Generate Puzzles"}
            </Button>
            <Button
              onClick={() => {
                void onSaveOrUpdatePuzzle(
                  activeBoard.id,
                  selected,
                  pairsToRender,
                ).then((success) => {
                  if (!success) return;
                  setIsRedirecting(true);
                  toast({
                    title: "Success",
                    description: `Board "${activeBoard.name}" created successfully`,
                    variant: "success",
                  });
                  onSaved?.();
                });
              }}
              disabled={
                !canSave || savingBoardId === activeBoard.id || isRedirecting
              }
            >
              {savingBoardId === activeBoard.id || isRedirecting
                ? "Saving..."
                : "Save Board"}
            </Button>
          </div>
        </article>
      ) : null}

      <InfinityRandomizedPuzzleEditor
        open={Boolean(editorPairId && editedPair)}
        grid={editorGrid}
        onRotateTile={rotateTileInEditor}
        onClose={() => {
          setEditorPairId("");
          setEditorGrid([]);
        }}
        onSave={() => {
          if (!editorPairId) return;
          const latestGrid = editorGridRef.current;
          // Ensure the updated randomized grid is committed before closing the modal,
          // otherwise fast click sequences can make it look like the save was ignored.
          flushSync(() => {
            setLocalPairs((prev) =>
              prev.map((pair) =>
                pair.id === editorPairId
                  ? { ...pair, randomizedGrid: latestGrid }
                  : pair,
              ),
            );
          });
          flushSync(() => {
            setEditorPairId("");
            setEditorGrid([]);
          });
          editorGridRef.current = [];
        }}
      />
    </section>
  );
};
