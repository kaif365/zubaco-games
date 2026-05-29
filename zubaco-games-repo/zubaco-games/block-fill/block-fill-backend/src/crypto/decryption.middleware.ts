import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

import { CryptoService } from './crypto.service';

@Injectable()
export class DecryptionMiddleware implements NestMiddleware {
    constructor(private readonly cryptoService: CryptoService) {}

    /**
     * Decrypts eligible encrypted HTTP request bodies before controller handling.
     * @param {Request} req - The incoming HTTP request.
     * @param {Response} _res - The outgoing HTTP response.
     * @param {NextFunction} next - The middleware continuation callback.
     * @returns {void} Nothing.
     */
    use(req: Request, _res: Response, next: NextFunction): void {
        const body: unknown = req.body;

        if (!this.cryptoService.isEnabled() || this.shouldSkip(req)) {
            next();
            return;
        }

        if (!this.hasBody(body)) {
            next();
            return;
        }

        try {
            if (!this.cryptoService.hasEncryptionFields(body)) {
                next();
                return;
            }

            if (!this.cryptoService.isEncryptedPayload(body)) {
                throw new BadRequestException('INVALID_ENCRYPTED_PAYLOAD');
            }

            const decryptedBody = this.cryptoService.decrypt(body) as unknown;
            req.body = decryptedBody;
            next();
        } catch {
            next(new BadRequestException('INVALID_ENCRYPTED_PAYLOAD'));
        }
    }

    /**
     * Checks whether decryption should be skipped for a request path.
     * @param {Request} req - The incoming HTTP request.
     * @returns {boolean} Whether decryption should be skipped.
     */
    private shouldSkip(req: Request): boolean {
        return (
            req.path.startsWith('/api') ||
            req.path.startsWith('/public') ||
            req.path.startsWith('/v1/boards') ||
            req.path.startsWith('/v1/levels') ||
            req.path.startsWith('/v1/stage-configs')
        );
    }

    /**
     * Checks whether a request body contains an object payload.
     * @param {unknown} body - The incoming request body.
     * @returns {boolean} Whether the body is a non-empty object.
     */
    private hasBody(body: unknown): boolean {
        return !!body && typeof body === 'object' && Object.keys(body).length > 0;
    }
}
