import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { STATUS_CODES, REQUEST_CONTEXT } from '../constants';
import type { ApiResponse } from '../interfaces/api-response.interface';
import type { RequestWithContext } from '../interfaces/request-context.interface';
import { getMessage } from '../responses';

type MessageResponse = Record<string, unknown> & { message?: unknown };

/**
 * Has message response.
 *
 * @param {unknown} value - The value.
 *
 * @returns {boolean} The result of hasMessageResponse.
 */
function hasMessageResponse(value: unknown): value is MessageResponse {
    return typeof value === 'object' && value !== null && 'message' in value;
}

/**
 * Interceptor that transforms all successful responses to match ApiResponse interface
 * Automatically wraps response data in a standardized format with i18n support
 * Language is extracted by LanguageMiddleware and attached to the request
 * @template T - The type of data being returned
 */
@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
    /**
     * Intercept.
     *
     * @param {ExecutionContext} context - The context.
     * @param {CallHandler<T>} next - The next.
     *
     * @returns {Observable<ApiResponse<T>>} The result of intercept.
     */
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
        const req = context.switchToHttp().getRequest<RequestWithContext>();
        const res = context.switchToHttp().getResponse<Response>();
        const stream = (next as { handle: () => Observable<T> }).handle();

        // Get language from request (set by LanguageMiddleware)
        const lang = req[REQUEST_CONTEXT.LANGUAGE] || 'en';

        return stream.pipe(
            map((data: T) => {
                let message = getMessage('OK', lang);
                let responseData: T | null = data;

                // Extract message if it exists in the response object
                if (hasMessageResponse(data)) {
                    if (typeof data.message === 'string') {
                        message = data.message;
                    }

                    // If data is just the message, set it to null
                    // Otherwise, remove message from data to avoid duplication
                    const { message: ignoredMessage, ...rest } = data;
                    void ignoredMessage;
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
