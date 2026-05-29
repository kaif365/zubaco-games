import { STATUS_CODES } from '../constants';
import type { ApiResponse } from '../interfaces/api-response.interface';

/**
 * Ws success.
 *
 * @param {T} data - The data.
 * @param {string} message - The message.
 *
 * @returns {ApiResponse<T>} The result of wsSuccess.
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
 * Ws error.
 *
 * @param {string} message - The message.
 * @param {number} statusCode - The status code.
 *
 * @returns {ApiResponse<null>} The result of wsError.
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
