import { useCallback, useRef, useState } from 'react';
import { gameApiClient, type MoveEntry, type GameStartData, type EndBoardData } from '@/services/gameApiClient';
import { DEFAULT_STAGE_ID } from '@/constants/api';
import type { Level } from '@/lib/game/types';
import type { ServerBoard } from '@/game/gameTypes';

/**
 * Maps a server board (API response) to a client Level object
 * that the useArrowGame reducer understands.
 */
function serverBoardToLevel(board: ServerBoard & { roundNumber?: number }): Level {
  const gridSize = Math.max(board.gridSize.x, board.gridSize.y);
  return {
    id: board.roundNumber ?? 1,
    title: board.name ?? `Round ${board.roundNumber ?? 1}`,
    gridSize,
    arrows: board.arrows
      .filter((a) => !a.isRemoved)
      .map((a) => {
        // Use the head position (last waypoint) as the arrow's grid position
        const head = a.waypoints[a.waypoints.length - 1] ?? { x: 0, y: 0 };
        return {
          row: head.y,
          col: head.x,
          direction: a.headDirection,
        };
      }),
  };
}

export interface SessionState {
  sessionId: string | null;
  roundNumber: number;
  totalRounds: number;
  expiryAt: string | null;
  isLoading: boolean;
  error: string | null;
  isConnected: boolean;
}

/**
 * Orchestrates backend API calls for the arrows game.
 * Works alongside useArrowGame (which handles local gameplay logic).
 */
export function useArrowGameSession() {
  const [session, setSession] = useState<SessionState>({
    sessionId: null,
    roundNumber: 0,
    totalRounds: 0,
    expiryAt: null,
    isLoading: false,
    error: null,
    isConnected: false,
  });

  const movesRef = useRef<MoveEntry[]>([]);
  const sessionIdRef = useRef<string | null>(null);

  /**
   * Start a new game session: authenticate → call game-start → return the first board as a Level.
   */
  const startSession = useCallback(async (): Promise<{ level: Level; timeLimitMs: number } | null> => {
    setSession((s) => ({ ...s, isLoading: true, error: null }));
    movesRef.current = [];

    try {
      // Authenticate
      await gameApiClient.auth(DEFAULT_STAGE_ID);

      // Start game
      const res = await gameApiClient.gameStart(DEFAULT_STAGE_ID);
      const data = res.data as GameStartData | undefined;
      if (!data?.board) {
        throw new Error('No board in game-start response');
      }

      sessionIdRef.current = data.sessionId;
      const expiryMs = data.expiryAt ? new Date(data.expiryAt).getTime() - Date.now() : 90000;

      setSession({
        sessionId: data.sessionId,
        roundNumber: data.board.roundNumber ?? 1,
        totalRounds: data.totalRounds ?? 1,
        expiryAt: data.expiryAt,
        isLoading: false,
        error: null,
        isConnected: true,
      });

      return {
        level: serverBoardToLevel(data.board),
        timeLimitMs: Math.max(expiryMs, 30000),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start game';
      console.warn('[ArrowGameSession] startSession failed, falling back to local:', msg);
      setSession((s) => ({ ...s, isLoading: false, error: msg, isConnected: false }));
      return null;
    }
  }, []);

  /**
   * Record a move (arrow removal) for batch submission.
   */
  const recordMove = useCallback((col: number, row: number) => {
    movesRef.current.push({
      x: col,
      y: row,
      clickedAt: new Date().toISOString(),
      moveId: crypto.randomUUID(),
    });
  }, []);

  /**
   * Submit accumulated moves to the backend.
   */
  const submitMoves = useCallback(async () => {
    if (movesRef.current.length === 0 || !session.isConnected) return;
    try {
      const moves = [...movesRef.current];
      movesRef.current = [];
      await gameApiClient.submitMoves(moves);
    } catch (err) {
      console.warn('[ArrowGameSession] submitMoves failed:', err);
    }
  }, [session.isConnected]);

  /**
   * End the current board/round. Returns next board if available.
   */
  const endBoard = useCallback(async (): Promise<{ level: Level; timeLimitMs: number } | null> => {
    if (!session.isConnected) return null;

    try {
      // Submit any remaining moves first
      await submitMoves();

      const res = await gameApiClient.endBoard();
      const data = res.data as EndBoardData | undefined;

      if (data?.gameOver) {
        return null; // No more boards
      }

      // Get next board
      const nextRes = await gameApiClient.nextBoard();
      const nextData = nextRes.data;
      if (!nextData) return null;

      const roundNumber = nextData.roundNumber ?? session.roundNumber + 1;
      setSession((s) => ({ ...s, roundNumber }));
      movesRef.current = [];

      const expiryMs = session.expiryAt ? new Date(session.expiryAt).getTime() - Date.now() : 90000;

      return {
        level: serverBoardToLevel({
          id: nextData.id ?? '',
          name: `Round ${roundNumber}`,
          gridSize: nextData.gridSize,
          arrows: nextData.arrows,
          roundNumber,
        }),
        timeLimitMs: Math.max(expiryMs, 30000),
      };
    } catch (err) {
      console.warn('[ArrowGameSession] endBoard failed:', err);
      return null;
    }
  }, [session.isConnected, session.roundNumber, session.expiryAt, submitMoves]);

  /**
   * End the entire game session and get final scores.
   */
  const endGame = useCallback(async () => {
    if (!session.isConnected) return null;

    try {
      await submitMoves();
      const res = await gameApiClient.endGame();
      setSession((s) => ({ ...s, isConnected: false }));
      return res.data;
    } catch (err) {
      console.warn('[ArrowGameSession] endGame failed:', err);
      setSession((s) => ({ ...s, isConnected: false }));
      return null;
    }
  }, [session.isConnected, submitMoves]);

  return {
    session,
    startSession,
    recordMove,
    submitMoves,
    endBoard,
    endGame,
  };
}
