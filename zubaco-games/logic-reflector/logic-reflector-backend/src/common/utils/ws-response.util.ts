import { STATUS_CODES } from "../constants";
import type { ApiResponse } from "../interfaces/api-response.interface";

/**
 * Handle ws success.
 *
 * @param {T} data - data value.
 * @param {string} message - message value.
 *
 * @returns {ApiResponse<T>} The ws success result.
 */
export function wsSuccess<T>(data: T, message = "Success"): ApiResponse<T> {
  return {
    success: true,
    statusCode: STATUS_CODES.OK,
    message,
    data: data ?? null,
  };
}

/**
 * Handle ws error.
 *
 * @param {string} message - message value.
 * @param {number} statusCode - status code value.
 *
 * @returns {ApiResponse<null>} The ws error result.
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
