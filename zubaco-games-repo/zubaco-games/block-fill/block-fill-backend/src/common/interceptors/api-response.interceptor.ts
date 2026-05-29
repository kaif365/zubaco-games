import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { STATUS_CODES, REQUEST_CONTEXT } from '../constants';
import { ApiResponse } from '../interfaces/api-response.interface';
import { getMessage } from '../responses';

interface ApiResponseRequest extends Request {
    [REQUEST_CONTEXT.LANGUAGE]?: string;
}

interface ApiResponseShape {
    message?: string;
    [key: string]: unknown;
}

function handleAsObservable<T>(next: CallHandler<T>): Observable<T> {
    // Nest types `handle()` loosely, but this interceptor always works with an Observable stream.

    return next.handle() as Observable<T>;
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
     * Intercepts the response and transforms it to ApiResponse format
     * Uses language preference from request (set by middleware)
     * @param {ExecutionContext} context - The execution context
     * @param {CallHandler} next - The next handler in the chain
     * @returns {Observable<ApiResponse<T>>} The transformed response
     */
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
        const req = context.switchToHttp().getRequest<ApiResponseRequest>();
        const res = context.switchToHttp().getResponse<{ statusCode?: number }>();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const response$ = handleAsObservable(next);

        // Get language from request (set by LanguageMiddleware)
        const lang = req[REQUEST_CONTEXT.LANGUAGE] || 'en';

        /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
        return response$.pipe(
            map((data) => {
                let message = getMessage('OK', lang);
                let responseData: T | null = data as T;

                // Extract message if it exists in the response object
                if (data && typeof data === 'object' && 'message' in data) {
                    const dataWithMessage = data as ApiResponseShape;
                    message =
                        typeof dataWithMessage.message === 'string'
                            ? dataWithMessage.message
                            : message;

                    // If data is just the message, set it to null
                    // Otherwise, remove message from data to avoid duplication
                    const { message: removedMessage, ...rest } = dataWithMessage;
                    void removedMessage;
                    responseData = Object.keys(rest).length > 0 ? (rest as T) : null;
                }

                return {
                    success: true,
                    statusCode: res.statusCode ?? STATUS_CODES.OK,
                    message,
                    data: responseData,
                };
            }),
        );
        /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    }
}
