"use client";

import { SocketEvent } from "@/constants/socket";
import { useUser } from "@/context/user-context";
import { persistSessionFromGameMeta } from "@/lib/auth";
import { logger } from "@/lib/default-logger";
import { parseGameMetaResponse } from "@/utils/parse-game-meta";
import { usePathname } from "next/navigation";
import React, {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";

export interface SocketContextValue {
  emit: (event: string, ...args: unknown[]) => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  off: (event: string, callback?: (...args: unknown[]) => void) => void;
  disconnect: () => void;
  isConnected: boolean;
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export const useSocket = (): SocketContextValue => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

interface SocketProviderProps {
  readonly children: ReactNode;
}

export function SocketProvider({
  children,
}: Readonly<SocketProviderProps>): React.JSX.Element {
  const { token, isTokenReady } = useUser();
  const pathname = usePathname();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const shouldEnableLiveSocket = pathname.startsWith("/game");

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!socketUrl) {
      logger.debug("NEXT_PUBLIC_SOCKET_URL is not defined. Socket skipped.");
      return () => {};
    }
    if (!isTokenReady) {
      logger.debug("User token not ready yet. Delaying socket mount.");
      return () => {};
    }
    if (!token) {
      logger.debug("User token resolved as empty. Socket mount skipped.");
      return () => {};
    }
    if (!shouldEnableLiveSocket) {
      logger.debug("Live mode not active. Socket mount skipped.");
      return () => {};
    }

    const authToken = token;
    logger.debug("Socket auth token available from user context.");

    const client: Socket = io(socketUrl, {
      transports: ["websocket"],
      auth: {
        authorization: authToken,
        token: authToken,
      },
    });

    startTransition(() => {
      setSocket(client);
    });

    client.on("connect", () => {
      logger.debug("Socket connected:", client.id);
      setIsConnected(true);
    });
    client.on("disconnect", (reason) => {
      logger.debug("Socket disconnected:", reason);
      setIsConnected(false);
    });
    client.on("connect_error", (err) => {
      logger.debug("Socket connection error:", err);
    });

    const handleGameMeta = (raw: unknown) => {
      const parsed = parseGameMetaResponse(raw);
      if (!parsed?.success || !parsed.data) {
        return;
      }
      void persistSessionFromGameMeta(parsed.data);
    };

    client.on(SocketEvent.META, handleGameMeta);

    return () => {
      client.off(SocketEvent.META, handleGameMeta);
      client.disconnect();
      startTransition(() => {
        setSocket(null);
      });
      setIsConnected(false);
      logger.debug("Socket cleanup - disconnected");
    };
  }, [isTokenReady, shouldEnableLiveSocket, token]);

  const emit = useCallback(
    (event: string, ...args: unknown[]) => {
      socket?.emit(event, ...args);
    },
    [socket],
  );

  const on = useCallback(
    (event: string, callback: (...args: unknown[]) => void) => {
      socket?.on(event, callback);
    },
    [socket],
  );

  const off = useCallback(
    (event: string, callback?: (...args: unknown[]) => void) => {
      if (!socket) return;
      if (callback) {
        socket.off(event, callback);
      } else {
        socket.off(event);
      }
    },
    [socket],
  );

  const disconnect = useCallback(() => {
    if (!socket) return;
    socket.disconnect();
    startTransition(() => {
      setSocket(null);
    });
    setIsConnected(false);
    logger.debug("Socket disconnected by client");
  }, [socket]);

  const contextValue = useMemo(
    () => ({
      emit,
      on,
      off,
      disconnect,
      isConnected,
      socket: isConnected ? socket : null,
    }),
    [emit, on, off, disconnect, isConnected, socket],
  );

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}
