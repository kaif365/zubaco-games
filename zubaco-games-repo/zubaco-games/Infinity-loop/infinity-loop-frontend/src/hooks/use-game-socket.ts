"use client";

import { useCallback } from "react";

import { SocketEvent } from "@/constants/socket";
import { useSocket } from "@/lib/socket-provider";
import type {
  AlreadyFinishedResponse,
  GameCompleteResponse,
  GameMetaResponse,
  RotateBatchPayload,
  RotatePayload,
  RotateResponse,
} from "@/types/socket";
import { parseGameMetaResponse } from "@/utils/parse-game-meta";
import { parseSocketExceptionPayload } from "@/utils/socket";

/**
 * Game module socket API — all game-specific emits go through here.
 */
export const useGameSocket = () => {
  const { emit, on, off, isConnected, socket, disconnect } = useSocket();

  const startGame = useCallback(() => {
    emit(SocketEvent.START);
  }, [emit]);

  const rotateGameTile = useCallback(
    (payload: RotatePayload) => {
      emit(SocketEvent.ROTATE, payload);
    },
    [emit],
  );

  const rotateGameTileBatch = useCallback(
    (payload: RotateBatchPayload) => {
      emit(SocketEvent.ROTATE_BATCH, payload);
    },
    [emit],
  );

  const completeGame = useCallback(() => {
    emit(SocketEvent.COMPLETE, {});
  }, [emit]);

  const onGameStarted = useCallback(
    (callback: (payload: unknown) => void) => {
      const wrapped = callback as (...args: unknown[]) => void;
      // New BE contract emits game:started for start flow.
      on(SocketEvent.STARTED, wrapped);
      return () => {
        off(SocketEvent.STARTED, wrapped);
      };
    },
    [off, on],
  );

  const onRotateResolved = useCallback(
    (callback: (payload: unknown) => void) => {
      const wrapped = callback as (...args: unknown[]) => void;
      on(SocketEvent.ROTATE, wrapped);
      return () => {
        off(SocketEvent.ROTATE, wrapped);
      };
    },
    [off, on],
  );

  const onGameCompleted = useCallback(
    (callback: (payload: unknown) => void) => {
      const wrapped = callback as (...args: unknown[]) => void;
      // Support both legacy and new completion channels.
      on(SocketEvent.COMPLETE, wrapped);
      on(SocketEvent.COMPLETE_SUCCESS, wrapped);
      return () => {
        off(SocketEvent.COMPLETE, wrapped);
        off(SocketEvent.COMPLETE_SUCCESS, wrapped);
      };
    },
    [off, on],
  );

  const onGameMeta = useCallback(
    (callback: (payload: unknown) => void) => {
      const wrapped = callback as (...args: unknown[]) => void;
      on(SocketEvent.META, wrapped);
      return () => {
        off(SocketEvent.META, wrapped);
      };
    },
    [off, on],
  );

  const parseGameMetaResponsePayload = useCallback(
    (raw: unknown): GameMetaResponse | null => parseGameMetaResponse(raw),
    [],
  );

  const onAlreadyFinished = useCallback(
    (callback: (payload: unknown) => void) => {
      const wrapped = callback as (...args: unknown[]) => void;
      on(SocketEvent.ALREADY_FINISHED, wrapped);
      on("message", wrapped);
      return () => {
        off(SocketEvent.ALREADY_FINISHED, wrapped);
        off("message", wrapped);
      };
    },
    [off, on],
  );

  const parseRotateResponse = useCallback(
    (raw: unknown): RotateResponse | null => {
      const candidate = Array.isArray(raw) ? raw[1] : raw;
      if (!candidate || typeof candidate !== "object") return null;
      if (!("success" in candidate)) return null;
      return candidate as RotateResponse;
    },
    [],
  );

  const parseCompleteResponse = useCallback(
    (raw: unknown): GameCompleteResponse | null => {
      const candidate = Array.isArray(raw) ? raw[1] : raw;
      if (!candidate || typeof candidate !== "object") return null;
      if (!("success" in candidate) || !("data" in candidate)) return null;
      return candidate as GameCompleteResponse;
    },
    [],
  );

  const parseAlreadyFinishedResponse = useCallback(
    (raw: unknown): AlreadyFinishedResponse | null => {
      const candidate = Array.isArray(raw) ? raw[1] : raw;
      if (!candidate || typeof candidate !== "object") return null;
      if (!("success" in candidate)) return null;
      return candidate as AlreadyFinishedResponse;
    },
    [],
  );

  const onSocketError = useCallback(
    (callback: (error: unknown) => void) => {
      const wrapped = callback as (...args: unknown[]) => void;
      on("error", wrapped);
      on("message", wrapped);
      on("connect_error", wrapped);
      return () => {
        off("error", wrapped);
        off("message", wrapped);
        off("connect_error", wrapped);
      };
    },
    [off, on],
  );

  const onSocketException = useCallback(
    (callback: (payload: unknown) => void) => {
      const wrapped = callback as (...args: unknown[]) => void;
      on(SocketEvent.EXCEPTION, wrapped);
      return () => {
        off(SocketEvent.EXCEPTION, wrapped);
      };
    },
    [off, on],
  );

  const parseSocketExceptionResponse = useCallback(
    (raw: unknown) => parseSocketExceptionPayload(raw),
    [],
  );

  return {
    startGame,
    rotateGameTile,
    rotateGameTileBatch,
    completeGame,
    onGameStarted,
    onGameMeta,
    onRotateResolved,
    onGameCompleted,
    onAlreadyFinished,
    parseGameMetaResponse: parseGameMetaResponsePayload,
    parseRotateResponse,
    parseCompleteResponse,
    parseAlreadyFinishedResponse,
    emit,
    on,
    off,
    onSocketError,
    onSocketException,
    parseSocketExceptionResponse,
    disconnect,
    isConnected,
    socket,
  };
};
