// /modules/game/hooks/use-game-state.ts
"use client";

import { logger } from "@/lib/default-logger";
import {
  checkWinCondition,
  isCellConnectedCorrect,
  isRotationEquivalent,
} from "@/lib/game/logic/engine";
import { shuffleGrid } from "@/lib/game/logic/generator";
import { getHandcraftedLevel } from "@/lib/game/logic/levels";
import { buildGridFromPuzzlePayload } from "@/lib/game/logic/puzzle-builder";
import type {
  BoardPayload,
  GameCompleteResponse,
  GameStartedResponse,
  RotateResponse,
} from "@/types/socket";
import { GridCell, TileState, TileType } from "@/types/tile";
import { getConnectionsForState } from "@/utils/tile";
import { useCallback, useEffect, useRef, useState } from "react";

export const shouldResetLiveBoardShellOnDimensionChange = (
  isTutorialMode: boolean,
  hasHydratedLiveBoard: boolean,
): boolean => isTutorialMode || !hasHydratedLiveBoard;

export const shouldInitializeTutorialBoard = (
  isTutorialMode: boolean,
  isTutorialBootstrapPending: boolean,
): boolean => isTutorialMode && !isTutorialBootstrapPending;

export const useGameState = (
  levelIndex: number,
  width: number,
  height: number,
  timeLimitSeconds: number,
  isTutorialMode: boolean,
  isTutorialBootstrapPending = false,
) => {
  const normalizeAccentColor = useCallback((value: unknown): string | null => {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (/^#([0-9A-F]{6}|[0-9A-F]{3})$/i.test(trimmed)) {
      return trimmed;
    }
    return null;
  }, []);

  const resolveStartAccentColor = useCallback(
    (payload: GameStartedResponse): string | null => {
      return (
        normalizeAccentColor(payload.data.board?.color) ??
        normalizeAccentColor((payload.data as { color?: unknown }).color) ??
        normalizeAccentColor(
          (
            payload.data.puzzle as
              | { color?: unknown; accentColor?: unknown }
              | undefined
          )?.color,
        ) ??
        normalizeAccentColor(
          (
            payload.data.board as
              | { accentColor?: unknown; primaryColor?: unknown }
              | undefined
          )?.accentColor,
        ) ??
        normalizeAccentColor(
          (
            payload.data.board as
              | { accentColor?: unknown; primaryColor?: unknown }
              | undefined
          )?.primaryColor,
        )
      );
    },
    [normalizeAccentColor],
  );

  const resolveNextBoardAccentColor = useCallback(
    (board: BoardPayload | null | undefined): string | null => {
      if (!board) {
        return null;
      }
      return (
        normalizeAccentColor(board.color) ??
        normalizeAccentColor(
          (board as { accentColor?: unknown }).accentColor,
        ) ??
        normalizeAccentColor((board as { primaryColor?: unknown }).primaryColor)
      );
    },
    [normalizeAccentColor],
  );

  interface RotateResolution {
    isBoardSolved: boolean;
    isStageComplete: boolean;
  }

  const [grid, setGrid] = useState<GridCell[][]>([]);
  const [moves, setMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [activeTimeLimitSeconds, setActiveTimeLimitSeconds] =
    useState(timeLimitSeconds);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(timeLimitSeconds);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [timeBonus, setTimeBonus] = useState<number | null>(null);
  const [boardAccentColor, setBoardAccentColor] = useState<string | null>(null);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [hintedCells, setHintedCells] = useState<{ x: number; y: number }[]>(
    [],
  );
  const [nextBoard, setNextBoard] = useState<BoardPayload | null>(null);
  const hasHydratedLiveBoardRef = useRef(false);

  const buildEmptyGrid = useCallback((w: number, h: number): GridCell[][] => {
    return Array.from({ length: h }, (_, y) =>
      Array.from({ length: w }, (_, x) => ({
        type: TileType.EMPTY,
        rotation: 0,
        correctRotation: 0,
        connections: { top: false, right: false, bottom: false, left: false },
        x,
        y,
        isCorrect: false,
      })),
    );
  }, []);

  const startNewGame = useCallback(
    (_idx: number, w: number, h: number) => {
      if (isTutorialMode) {
        const handcrafted = getHandcraftedLevel(levelIndex);
        if (handcrafted) {
          const baseGrid = handcrafted.tiles.map((row, y) =>
            row.map((t, x) => ({
              type: t.type,
              rotation: t.correctRotation,
              correctRotation: t.correctRotation,
              connections: getConnectionsForState({
                type: t.type,
                rotation: t.correctRotation,
              }),
              x,
              y,
              isCorrect: true,
            })),
          );
          const shuffled = shuffleGrid(baseGrid).map((row) =>
            row.map((cell) => ({ ...cell, isCorrect: false })),
          );
          setGrid(shuffled);
        } else {
          setGrid(buildEmptyGrid(w, h));
        }
        // Tutorial should always use level palette accents, never stale board accent.
        setBoardAccentColor(null);
      } else {
        setGrid(buildEmptyGrid(w, h));
        // Keep current accent until a server board color arrives to avoid
        // flashing back to palette defaults during reconnect/start transitions.
      }
      hasHydratedLiveBoardRef.current = false;
      setMoves(0);
      setIsWon(false);
      setIsTimeUp(false);
      setHasStarted(false);
      const effectiveLimit = isTutorialMode ? 0 : timeLimitSeconds;
      setActiveTimeLimitSeconds(effectiveLimit);
      setTimeLeftSeconds(effectiveLimit);
      setStartTime(null);
      setScore(null);
      setTimeBonus(null);
      setActiveBoardId(null);
      setHintedCells([]);
      setNextBoard(null);
    },
    [buildEmptyGrid, isTutorialMode, levelIndex, timeLimitSeconds],
  );

  const beginGame = useCallback(() => {
    if (hasStarted || isWon || isTimeUp) return;
    setHasStarted(true);
    setStartTime(Date.now());
  }, [hasStarted, isTimeUp, isWon]);

  const applyGameStartedResponse = useCallback(
    (payload: GameStartedResponse) => {
      if (isTutorialMode) return;
      if (!payload.success || !payload.data) return;
      const normalizedPuzzle =
        payload.data.puzzle ??
        (() => {
          const board = payload.data.board;
          if (!board) return null;
          return {
            grid: board.grid,
            rows: board.gridY,
            cols: board.gridX,
            moves: board.moves ?? 0,
            remainingTime: board.remainingTime,
            timeLimit: board.timeLimit,
          };
        })();
      if (!normalizedPuzzle) return;
      const serverTimeLimit =
        normalizedPuzzle.remainingTime ??
        payload.data.config?.remainingTime ??
        timeLimitSeconds;

      const serverGrid = buildGridFromPuzzlePayload(normalizedPuzzle);
      const resolvedGrid = serverGrid.map((row, y) =>
        row.map((cell, x) => ({
          ...cell,
          x,
          y,
          isCorrect: isCellConnectedCorrect(serverGrid, x, y),
        })),
      );

      setGrid(resolvedGrid);
      setMoves(normalizedPuzzle.moves ?? 0);
      // Legacy local-completion detection removed: completion is socket-authoritative.
      setIsWon(false);
      setIsTimeUp(false);
      setHasStarted(true);
      setActiveTimeLimitSeconds(serverTimeLimit);
      setTimeLeftSeconds(serverTimeLimit);
      setStartTime(Date.now());
      setScore(null);
      setTimeBonus(null);
      setActiveBoardId(payload.data.board?.id ?? null);
      setBoardAccentColor(resolveStartAccentColor(payload));
      setHintedCells([]);
      setNextBoard(null);
      hasHydratedLiveBoardRef.current = true;
    },
    [isTutorialMode, resolveStartAccentColor, timeLimitSeconds],
  );

  const applyRotateResolutionMeta = useCallback(
    (payload: RotateResponse): RotateResolution => {
      if (isTutorialMode)
        return { isBoardSolved: false, isStageComplete: false };
      if (!payload.success || !payload.data) {
        return { isBoardSolved: false, isStageComplete: false };
      }
      const isBoardSolved = payload.data.isBoardSolved === true;
      setMoves(payload.data.moves ?? 0);
      setIsWon(isBoardSolved);
      setNextBoard(payload.data.nextBoard ?? null);
      return {
        isBoardSolved,
        isStageComplete: payload.data.isStageComplete === true,
      };
    },
    [isTutorialMode],
  );

  const syncGridFromRotatePayload = useCallback(
    (payload: RotateResponse) => {
      if (isTutorialMode || !payload.success || !payload.data) return;
      if (payload.data.isBoardSolved) return;
      const normalizedPuzzle = {
        grid: payload.data.grid,
        rows: payload.data.grid.length,
        cols: payload.data.grid[0]?.length ?? 0,
        moves: payload.data.moves,
      };
      const serverGrid = buildGridFromPuzzlePayload(normalizedPuzzle);
      const resolvedGrid = serverGrid.map((row, y) =>
        row.map((cell, x) => ({
          ...cell,
          x,
          y,
          isCorrect: isCellConnectedCorrect(serverGrid, x, y),
        })),
      );
      setGrid(resolvedGrid);
    },
    [isTutorialMode],
  );

  const startNextBoard = useCallback(() => {
    if (!nextBoard) return false;
    const normalizedPuzzle = {
      grid: nextBoard.grid,
      rows: nextBoard.gridY,
      cols: nextBoard.gridX,
      moves: 0,
      remainingTime: nextBoard.remainingTime,
      timeLimit: nextBoard.timeLimit,
    };
    const serverGrid = buildGridFromPuzzlePayload(normalizedPuzzle);
    const resolvedGrid = serverGrid.map((row, y) =>
      row.map((cell, x) => ({
        ...cell,
        x,
        y,
        isCorrect: isCellConnectedCorrect(serverGrid, x, y),
      })),
    );
    const serverTimeLimit = normalizedPuzzle.remainingTime ?? timeLimitSeconds;
    setGrid(resolvedGrid);
    setMoves(0);
    setIsWon(false);
    setIsTimeUp(false);
    setHasStarted(true);
    setActiveTimeLimitSeconds(serverTimeLimit);
    setTimeLeftSeconds(serverTimeLimit);
    setStartTime(Date.now());
    setScore(null);
    setTimeBonus(null);
    setActiveBoardId(nextBoard.id);
    setBoardAccentColor(resolveNextBoardAccentColor(nextBoard));
    setHintedCells([]);
    setNextBoard(null);
    hasHydratedLiveBoardRef.current = true;
    return true;
  }, [nextBoard, resolveNextBoardAccentColor, timeLimitSeconds]);

  const applyGameCompletedResponse = useCallback(
    (payload: GameCompleteResponse) => {
      if (isTutorialMode) return;
      if (!payload.success || !payload.data) return;
      setIsWon(true);
      setScore(payload.data.score ?? null);
      setTimeBonus(payload.data.timeBonus ?? null);
    },
    [isTutorialMode],
  );

  /** Server signaled stage end (e.g. TIME_UP); freeze play even if local clock lags. */
  const applyServerTimeUpFreeze = useCallback(() => {
    if (isTutorialMode) return;
    setIsTimeUp(true);
    setTimeLeftSeconds(0);
  }, [isTutorialMode]);

  const rotateTile = useCallback(
    (x: number, y: number): boolean | null => {
      if (isWon || isTimeUp) return null;
      if (!hasStarted) {
        if (!isTutorialMode) return null;
        // Tutorial UX: first click should both start timer and rotate tile.
        setHasStarted(true);
        setStartTime(Date.now());
      }

      let wonAfterThisMove = false;
      setGrid((prev) => {
        const newGrid = prev.map((row) => row.map((cell) => ({ ...cell })));
        const cell = newGrid[y][x];
        const nextRotation = (cell.rotation + 1) % 4;
        logger.debug("[TileRotate]", {
          x,
          y,
          tileType: cell.type,
          previousRotation: cell.rotation,
          nextRotation,
        });
        cell.rotation = nextRotation;
        cell.connections = getConnectionsForState(cell as TileState);

        // Update cell isCorrect purely based on local connection for visual polish
        // But we check win globally
        newGrid.forEach((r, cy) =>
          r.forEach((c, cx) => {
            c.isCorrect = isCellConnectedCorrect(newGrid, cx, cy);
          }),
        );

        const playableTiles = newGrid
          .flat()
          .filter((c) => c.type !== TileType.EMPTY);
        const totalPlayable = playableTiles.length;
        const totalCorrectPlayable = playableTiles.filter(
          (c) => c.isCorrect,
        ).length;
        logger.debug("[RotationProgress]", {
          rotationPerformedAt: { x, y },
          totalPlayable,
          totalCorrectPlayable,
          remainingPlayable: totalPlayable - totalCorrectPlayable,
        });

        if (isTutorialMode && checkWinCondition(newGrid)) {
          wonAfterThisMove = true;
          setIsWon(true);
        }
        return newGrid;
      });
      setMoves((m) => m + 1);

      // Clear hint if the hinted tile was rotated correctly
      setHintedCells((prev) => prev.filter((h) => !(h.x === x && h.y === y)));

      return wonAfterThisMove;
    },
    [hasStarted, isTimeUp, isTutorialMode, isWon],
  );

  const revertTileRotation = useCallback(
    (x: number, y: number) => {
      if (!hasStarted || isWon || isTimeUp) return;

      setGrid((prev) => {
        const newGrid = prev.map((row) => row.map((cell) => ({ ...cell })));
        const cell = newGrid[y]?.[x];
        if (!cell) return prev;
        const previousRotation = (cell.rotation + 3) % 4;
        cell.rotation = previousRotation;
        cell.connections = getConnectionsForState(cell as TileState);

        newGrid.forEach((r, cy) =>
          r.forEach((c, cx) => {
            c.isCorrect = isCellConnectedCorrect(newGrid, cx, cy);
          }),
        );

        return newGrid;
      });
      setMoves((m) => Math.max(0, m - 1));
    },
    [hasStarted, isTimeUp, isWon],
  );

  const triggerHint = useCallback(() => {
    if (!hasStarted || isWon || isTimeUp) return null;

    // Show one incorrect tile
    const incorrect: { x: number; y: number }[] = [];
    grid.forEach((row, y) =>
      row.forEach((cell, x) => {
        if (
          !isRotationEquivalent(cell.type, cell.rotation, cell.correctRotation)
        ) {
          incorrect.push({ x, y });
        }
      }),
    );

    if (incorrect.length > 0) {
      const randomHint =
        incorrect[Math.floor(Math.random() * incorrect.length)];
      setHintedCells((prev) => [...prev, randomHint]);
      return randomHint;
    }
    return null;
  }, [grid, hasStarted, isTimeUp, isWon]);

  useEffect(() => {
    if (isTutorialMode || !hasStarted || !startTime || isWon || isTimeUp)
      return;

    const tick = () => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, activeTimeLimitSeconds - elapsedSeconds);
      setTimeLeftSeconds(remaining);
      if (remaining <= 0) {
        setIsTimeUp(true);
      }
    };

    tick();
    const intervalId = globalThis.setInterval(tick, 250);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, [
    hasStarted,
    startTime,
    isWon,
    isTimeUp,
    activeTimeLimitSeconds,
    isTutorialMode,
  ]);

  useEffect(() => {
    if (
      !shouldInitializeTutorialBoard(isTutorialMode, isTutorialBootstrapPending)
    ) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startNewGame(levelIndex, width, height);
  }, [
    isTutorialBootstrapPending,
    isTutorialMode,
    levelIndex,
    width,
    height,
    startNewGame,
  ]);

  useEffect(() => {
    if (
      !shouldResetLiveBoardShellOnDimensionChange(
        isTutorialMode,
        hasHydratedLiveBoardRef.current,
      )
    ) {
      return;
    }
    // Live boards come only from the socket. Before the first socket hydration,
    // keep the empty shell aligned with config changes; after hydration, do not
    // let late config updates wipe the active server board.
    startNewGame(0, width, height);
  }, [isTutorialMode, width, height, startNewGame]);

  return {
    grid,
    moves,
    isWon,
    isTimeUp,
    hasStarted,
    activeTimeLimitSeconds,
    timeLeftSeconds,
    startTime,
    hintedCells,
    score,
    timeBonus,
    boardAccentColor,
    activeBoardId,
    rotateTile,
    revertTileRotation,
    triggerHint,
    applyGameStartedResponse,
    applyRotateResolutionMeta,
    syncGridFromRotatePayload,
    applyGameCompletedResponse,
    applyServerTimeUpFreeze,
    startNextBoard,
    beginGame,
    startNewGame: () => startNewGame(levelIndex, width, height),
  };
};
