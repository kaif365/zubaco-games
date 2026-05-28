import { Catch, ArgumentsHost, Logger, HttpException } from "@nestjs/common";
import { BaseWsExceptionFilter, WsException } from "@nestjs/websockets";
import type { Socket } from "socket.io";

import { STATUS_CODES } from "../constants";
import { getMessage } from "../responses";
import { wsError } from "../utils/ws-response.util";

/**
 * Global WebSocket exception filter.
 * Catches all exceptions thrown in gateway handlers and emits them back
 * as a standardised ApiResponse-shaped object via the socket 'exception' event.
 */
@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  /**
   * Handle the caught exception.
   *
   * @param {unknown} exception - Exception thrown during socket handling.
   * @param {ArgumentsHost} host - host value.
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToWs();
    const client = ctx.getClient<Socket>();

    // Extract language from handshake headers
    const langHeader: unknown =
      client.handshake.headers["accept-language"] ?? "en";
    const langValue: unknown = Array.isArray(langHeader)
      ? (langHeader as unknown[])[0]
      : langHeader;
    const lang = typeof langValue === "string" ? langValue.split(",")[0] : "en";

    let message = "INTERNAL_SERVER_ERROR";
    let statusCode: number = STATUS_CODES.INTERNAL_SERVER_ERROR;

    if (exception instanceof WsException) {
      const error = exception.getError();
      message = this.getExceptionMessage(error, "WS_ERROR");
      statusCode = STATUS_CODES.BAD_REQUEST;
    } else if (exception instanceof HttpException) {
      const res = exception.getResponse();
      message = this.getExceptionMessage(res, "HTTP_ERROR");
      statusCode = exception.getStatus();
    } else {
      // Log real unexpected errors
      this.logger.error(
        "Unhandled Socket Exception",
        exception instanceof Error ? exception.stack : exception,
      );
    }

    // Translate message
    const translatedMessage = getMessage(message, lang);
    const response = wsError(translatedMessage, statusCode);

    this.logger.warn(
      `Socket Error [${statusCode}]: ${message} -> ${translatedMessage}`,
    );

    // Emit to the client directly — received by socket.on('exception', ...)
    client.emit("exception", response);
  }

  /**
   * Get exception message.
   *
   * @param {unknown} error - Error payload to normalize.
   * @param {string} fallback - fallback value.
   *
   * @returns {string} The string result.
   */
  private getExceptionMessage(error: unknown, fallback: string): string {
    if (typeof error === "string") {
      return error;
    }
    if (typeof error === "object" && error !== null && "message" in error) {
      const message = error.message;
      if (typeof message === "string") {
        return message;
      }
    }
    return fallback;
  }
}
