import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

import { STATUS_CODES } from "../constants";
import { ApiResponse } from "../interfaces/api-response.interface";
import { getMessage } from "../responses";

/**
 * Interceptor that transforms all successful responses to match ApiResponse interface
 * Automatically wraps response data in a standardized format with i18n support
 * Language is extracted by LanguageMiddleware and attached to the request
 * @template T - The type of data being returned
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
   * @param {CallHandler} next - next value.
   *
   * @returns {Observable<ApiResponse<T>>} The response stream.
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    // Get language from request (set by LanguageMiddleware)
    const lang = req.language ?? "en";

    return next.handle().pipe(
      map((data: T) => {
        let message = getMessage("OK", lang);
        let responseData: T | null = data;

        // Extract message if it exists in the response object
        if (data && typeof data === "object" && "message" in data) {
          const dataObject = data as Record<string, unknown>;
          if (typeof dataObject.message === "string") {
            message = dataObject.message;
          }

          // If data is just the message, set it to null
          // Otherwise, remove message from data to avoid duplication
          const rest = { ...dataObject };
          delete rest.message;
          responseData = Object.keys(rest).length > 0 ? (rest as T) : null;
        }

        return {
          success: true,
          statusCode: res.statusCode ?? STATUS_CODES.OK,
          message,
          data: responseData ?? null,
        };
      }),
    );
  }
}
