import * as restate from '@restatedev/restate-sdk';

interface TerminalErrorPayload {
    message: string;
    data?: unknown;
}

/**
 * Throw a Restate TerminalError.
 *
 * When `data` is provided, the message is JSON-encoded so the API exception
 * filter can extract structured data and forward it to the client.
 * Without `data`, the message is sent as plain text for backward compatibility.
 */
export function throwTerminalError(message: string, statusCode: number, data?: unknown): never {
    const encoded: string =
        data !== undefined
            ? JSON.stringify({ message, data } satisfies TerminalErrorPayload)
            : message;
    throw new restate.TerminalError(encoded, { errorCode: statusCode });
}

/**
 * Parse a Restate terminal error payload (the `responseText` from an HttpCallError).
 *
 * Returns `{ message, data }` when the payload is a valid JSON terminal error envelope,
 * or `{ message: raw }` when it is plain text.
 */
export function parseTerminalErrorPayload(raw: string): { message: string; data?: unknown } {
    try {
        const parsed: unknown = JSON.parse(raw);
        if (
            typeof parsed === 'object' &&
            parsed !== null &&
            'message' in parsed &&
            typeof parsed.message === 'string'
        ) {
            const { message, data } = parsed as TerminalErrorPayload;
            return { message, data };
        }
    } catch {
        // not JSON — fall through
    }
    return { message: raw };
}
