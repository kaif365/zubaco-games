import { STATUS_CODES } from "@common/constants";
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Response } from "express";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

import type { ApiResponse } from "../interfaces/api-response.interface";

type ResponsePayload = Record<string, unknown> & { message?: string };

/**
 * Wraps controller responses in the shared API envelope format.
 */
@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  /**
   * Intercept the request lifecycle.
   *
   * @param {ExecutionContext} context - context value.
   * @param {CallHandler<T>} next - next value.
   *
   * @returns {Observable<ApiResponse<T>>} The response stream.
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();
    // Nest exposes CallHandler with an unresolved stream type here, so we
    // narrow it locally and keep the unsafe suppression scoped to this block.

    /* eslint-disable @typescript-eslint/unbound-method */
    const handle = next.handle as () => Observable<T>;
    /* eslint-enable @typescript-eslint/unbound-method */

    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    const response$ = handle();
    const wrappedResponse$ = response$.pipe(
      map((data: T) => {
        let message = "OK";
        let responseData: T | null = data;

        if (data && typeof data === "object" && "message" in (data as object)) {
          const responseObject = data as ResponsePayload;

          if (typeof responseObject.message === "string") {
            message = responseObject.message;
          }

          const { message: _message, ...rest } = responseObject;
          void _message;
          responseData = Object.keys(rest).length > 0 ? (rest as T) : null;
        }

        return {
          success: true,
          statusCode: response.statusCode ?? STATUS_CODES.OK,
          message,
          data: responseData ?? null,
        };
      }),
    );
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

    return wrappedResponse$;
  }
}
