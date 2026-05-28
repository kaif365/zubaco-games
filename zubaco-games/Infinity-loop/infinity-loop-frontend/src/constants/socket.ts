export enum SocketChannel {
  GAME = "game-channel",
}

export enum SocketEvent {
  START = "game:start",
  STARTED = "game:started",
  ROTATE = "game:rotate",
  ROTATE_BATCH = "game:rotate:batch",
  COMPLETE = "game:complete",
  COMPLETE_SUCCESS = "game:complete:success",
  ALREADY_FINISHED = "game:already_finished",
  META = "game:meta",
  EXCEPTION = "exception",
}

export const Sockets = {
  ChannelName: SocketChannel,
  EventNames: SocketEvent,
} as const;

export const SOCKET_ERROR_MESSAGES = {
  AUTH_FAILED: "AUTH_FAILED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
} as const;
