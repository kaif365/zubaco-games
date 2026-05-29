import { PipeTransform, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { ZodType } from 'zod';

@Injectable()
export class WsZodPipe<T> implements PipeTransform {
    constructor(private readonly schema: ZodType<T>) {}

    /**
     * Validates a websocket payload against the configured Zod schema.
     * @param {unknown} value - The incoming websocket payload.
     * @returns {T} The validated payload.
     */
    transform(value: unknown): T {
        const result = this.schema.safeParse(value);
        if (!result.success) {
            const message = result.error.issues.map((e) => e.message).join(', ');
            throw new WsException(message);
        }
        return result.data;
    }
}
