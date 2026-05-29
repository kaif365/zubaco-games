"use client";

import { useCallback, useEffect, useState } from "react";
import { getInfinityPuzzlePairsByGrid } from "@/services/infinity-puzzle-service";
import {
  createInfinityBoard,
  deleteInfinityBoards,
  fetchInfinityBoards,
} from "@/services/infinity-loop-boards";
import type { CreateInfinityBoardRequest } from "@/services/infinity-loop-boards";
import type {
  InfinityBoardSettings,
  InfinityPuzzlePair,
  InfinityTileCell,
} from "@/types/games/infinity-loop/infinity-loop-board-editor";
import {
  backendTileIdToTypeAndRotation,
  typeAndRotationToBackendTileId,
} from "@/utils/infinity-tile-bitmasks";
import { useToast } from "@/providers/ToastProvider";

const DEFAULT_COLOR = "#7dd3fc";
const DEFAULT_DIFFICULTY: InfinityBoardSettings["difficulty"] = "EASY";

const normalizeDifficulty = (
  value?: string,
): InfinityBoardSettings["difficulty"] => {
  const normalized = value?.toUpperCase();
  if (
    normalized === "EASY" ||
    normalized === "MEDIUM" ||
    normalized === "HARD"
  ) {
    return normalized;
  }
  return DEFAULT_DIFFICULTY;
};

const tileGridToBitmaskGrid = (grid: InfinityTileCell[][]): number[][] =>
  grid.map((row) =>
    row.map((cell) => typeAndRotationToBackendTileId(cell.type, cell.rotation)),
  );

const bitmaskGridToTileGrid = (grid: number[][]): InfinityTileCell[][] =>
  grid.map((row, y) =>
    row.map((tileId, x) => {
      const tile = backendTileIdToTypeAndRotation(tileId);
      return {
        x,
        y,
        type: tile.type,
        rotation: tile.rotation,
        correctRotation: tile.rotation,
        isCorrect: true,
      };
    }),
  );

const mapBoardDtoToSettings = (board: unknown): InfinityBoardSettings => {
  const record = board as {
    id: string;
    name: string;
    level?: { name?: string };
    gridX?: number;
    gridY?: number;
    grid?: number[][];
    color?: string;
    timeLimit?: number;
  };

  const hasGrid =
    Array.isArray(record.grid) &&
    record.grid.length > 0 &&
    record.grid.every(
      (row) =>
        Array.isArray(row) && row.length > 0 && row.every(Number.isFinite),
    );

  const mappedGrid = hasGrid ? bitmaskGridToTileGrid(record.grid!) : [];
  const existingPairId = hasGrid ? `existing-${record.id}` : undefined;

  return {
    id: record.id,
    name: record.name,
    difficulty: normalizeDifficulty(record.level?.name),
    rows: record.gridX || 3,
    columns: record.gridY || 3,
    generationLimit: 1,
    color: record.color || DEFAULT_COLOR,
    selectedPuzzlePairId: existingPairId,
    puzzlePairs: hasGrid
      ? [
          {
            id: existingPairId!,
            label: "Existing Grid",
            completeGrid: mappedGrid,
            randomizedGrid: mappedGrid,
          },
        ]
      : [],
  };
};

export const useInfinityBoardCrud = (
  gameId: string,
  gameName: string,
  levelId: string,
  options: { loadBoards?: boolean } = {},
) => {
  const { loadBoards = true } = options;
  const { toast } = useToast();
  const [boards, setBoards] = useState<InfinityBoardSettings[]>([]);
  const [puzzlePairs, setPuzzlePairs] = useState<InfinityPuzzlePair[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [loadingPairs, setLoadingPairs] = useState(false);
  const [savingBoardId, setSavingBoardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reloadBoards = useCallback(async () => {
    setLoadingBoards(true);
    setError(null);
    try {
      const response = await fetchInfinityBoards(
        { levelId, limit: 100 },
        undefined,
        gameName,
      );
      const items = (response.data || []).map(mapBoardDtoToSettings);
      setBoards((prev) => {
        const draftBoards = prev.filter((board) =>
          board.id.startsWith("draft-"),
        );
        return [...draftBoards, ...items];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load boards");
    } finally {
      setLoadingBoards(false);
    }
  }, [gameName, levelId]);

  useEffect(() => {
    if (!loadBoards) return;
    const timeoutId = globalThis.window.setTimeout(() => {
      void reloadBoards();
    }, 0);
    return () => globalThis.window.clearTimeout(timeoutId);
  }, [loadBoards, reloadBoards]);

  const createBoard = useCallback(async () => {
    const draftId = `draft-${crypto.randomUUID()}`;
    setBoards((prev) => [
      ...prev,
      {
        id: draftId,
        name: `Board ${prev.length + 1}`,
        difficulty: DEFAULT_DIFFICULTY,
        rows: 3,
        columns: 3,
        generationLimit: 1,
        color: DEFAULT_COLOR,
        timeLimit: 120,
        selectedPuzzlePairId: undefined,
        puzzlePairs: [],
      },
    ]);
    return draftId;
  }, []);

  const updateBoard = useCallback(
    async (boardId: string, patch: Partial<InfinityBoardSettings>) => {
      setError(null);
      setBoards((prev) =>
        prev.map((board) =>
          board.id === boardId ? { ...board, ...patch } : board,
        ),
      );
    },
    [],
  );

  const deleteBoard = useCallback(
    async (boardId: string) => {
      setError(null);
      if (boardId.startsWith("draft-")) {
        setBoards((prev) => prev.filter((board) => board.id !== boardId));
        return;
      }
      try {
        await deleteInfinityBoards([boardId], undefined, gameName);
        setBoards((prev) => prev.filter((board) => board.id !== boardId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete board");
      }
    },
    [gameName],
  );

  const fetchPuzzlePairs = useCallback(
    async (
      rows: number,
      columns: number,
      difficulty: InfinityBoardSettings["difficulty"],
      generationLimit = 1,
    ) => {
      setLoadingPairs(true);
      setError(null);
      const normalizedLimit = Math.min(Math.max(generationLimit, 1), 10);
      try {
        const pairs = await getInfinityPuzzlePairsByGrid(
          rows,
          columns,
          difficulty.toLowerCase() as "easy" | "medium" | "hard",
          normalizedLimit,
          undefined,
          gameName,
        );
        setPuzzlePairs(pairs);
        return pairs;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch puzzle pairs",
        );
        return [];
      } finally {
        setLoadingPairs(false);
      }
    },
    [gameName],
  );

  const saveOrUpdatePuzzle = useCallback(
    async (
      boardId: string,
      selectedPuzzlePairId: string,
      pairs: InfinityPuzzlePair[],
    ): Promise<boolean> => {
      const board = boards.find((item) => item.id === boardId);
      if (!board) return false;
      setSavingBoardId(boardId);
      setError(null);

      const selectedPair = pairs.find(
        (pair) => pair.id === selectedPuzzlePairId,
      );

      const payload: CreateInfinityBoardRequest = {
        levelId,
        name: board.name,
        grid:
          selectedPair?.randomizedGrid && selectedPair.randomizedGrid.length > 0
            ? tileGridToBitmaskGrid(selectedPair.randomizedGrid)
            : [[0]],
        gridX: board.rows,
        gridY: board.columns,
        color: board.color || DEFAULT_COLOR,
      } satisfies CreateInfinityBoardRequest;

      try {
        setBoards((prev) =>
          prev.map((item) =>
            item.id === boardId
              ? { ...item, selectedPuzzlePairId, puzzlePairs: pairs }
              : item,
          ),
        );

        if (boardId.startsWith("draft-")) {
          await createInfinityBoard(payload, undefined, gameName);
          // Don't swap the local draft id to the server id here; doing so can make the
          // editor lose its active board (it still references the draft id) and causes
          // a blank form before redirect. The list will refresh on the boards screen.
          return true;
        }

        // Update not implemented in this branch; treat as create-only editor.
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save board";
        setError(message);
        toast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        return false;
      } finally {
        setSavingBoardId(null);
      }
    },
    [boards, gameName, levelId, toast],
  );

  return {
    boards,
    puzzlePairs,
    loadingBoards,
    loadingPairs,
    savingBoardId,
    error,
    createBoard,
    updateBoard,
    deleteBoard,
    fetchPuzzlePairs,
    saveOrUpdatePuzzle,
    reloadBoards,
  };
};
