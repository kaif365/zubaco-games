import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

import { ApiResponse } from "../interfaces/api-response.interface";
import { getMessage } from "../responses";

/**
 * Interceptor that transforms successful WebSocket responses to match ApiResponse interface
 * and handles i18n for the 'message' field.
 */
@Injectable()
export class WsResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  /**
   * Intercept the request lifecycle.
   *
   * @param {ExecutionContext} context - context value.
   * @param {CallHandler} next - next value.
   *
   * @returns {Observable<ApiResponse<T>>} The response stream.
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const client = context.switchToWs().getClient<{
      handshake?: { headers?: Record<string, string | string[]> };
    }>();

    // Extract language from handshake headers
    const rawHeader = client.handshake?.headers?.["accept-language"] ?? "en";
    const langHeader = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    const lang = langHeader.split(",")[0] ?? "en";

    return next.handle().pipe(
      map((data: unknown) => {
        // If data is an ApiResponse (e.g. from wsSuccess), translate its message
        if (
          data &&
          typeof data === "object" &&
          "message" in data &&
          "success" in data
        ) {
          const response = data as ApiResponse<T>;
          response.message = getMessage(response.message, lang);
          return response;
        }

        // Otherwise wrap it or return as is (if not using wsSuccess)
        return data as ApiResponse<T>;
      }),
    );
  }
}
