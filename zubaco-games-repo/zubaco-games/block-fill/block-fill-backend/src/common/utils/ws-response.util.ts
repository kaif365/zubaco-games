import { STATUS_CODES } from '../constants';
import type { ApiResponse } from '../interfaces/api-response.interface';

/**
 * Builds a standardised success response for WebSocket handlers.
 * Mirrors the HTTP ApiResponse shape so clients use one schema for both transports.
 * @param {T} data - The response payload.
 * @param {string} [message] - The success message.
 * @returns {ApiResponse<T>} The standardized websocket success response.
 */
export function wsSuccess<T>(data: T, message = 'Success'): ApiResponse<T> {
    return {
        success: true,
        statusCode: STATUS_CODES.OK,
        message,
        data: data ?? null,
    };
}

/**
 * Builds a standardised error response for the WsExceptionFilter.
 * @param {string} message - The error message.
 * @param {number} [statusCode] - The status code to include in the response.
 * @returns {ApiResponse<null>} The standardized websocket error response.
 */
export function wsError(
    message: string,
    statusCode: number = STATUS_CODES.BAD_REQUEST,
): ApiResponse<null> {
    return {
        success: false,
        statusCode,
        message,
        data: null,
    };
}
