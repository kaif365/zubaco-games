import { BadRequestException, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

import { CryptoService } from './crypto.service';

@Injectable()
export class DecryptionMiddleware implements NestMiddleware {
    private readonly logger = new Logger(DecryptionMiddleware.name);

    constructor(private readonly cryptoService: CryptoService) {}

    /**
     * Hook for .
     *
     * @param {Request<ParamsDictionary, any, any, QueryString.ParsedQs, Record<string, any>>} req - The req.
     * @param {Response<any, Record<string, any>>} _res - The res.
     * @param {NextFunction} next - The next.
     *
     * @returns {void} No return value.
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

            req.body = this.cryptoService.decrypt<unknown>(body);
            next();
        } catch (err) {
            this.logger.warn(
                `Decryption failed: ${req.method} ${req.path} ip=${req.ip} error=${(err as Error).message ?? String(err)}`,
            );
            next(new BadRequestException('INVALID_ENCRYPTED_PAYLOAD'));
        }
    }

    /**
     * Should skip.
     *
     * @param {Request<ParamsDictionary, any, any, QueryString.ParsedQs, Record<string, any>>} req - The req.
     *
     * @returns {boolean} The result of shouldSkip.
     */
    private shouldSkip(req: Request): boolean {
        return (
            req.path.startsWith('/api') ||
            req.path.startsWith('/public') ||
            req.path.startsWith('/v1/crypto/debug')
        );
    }

    /**
     * Has body.
     *
     * @param {unknown} body - The body.
     *
     * @returns {boolean} The result of hasBody.
     */
    private hasBody(body: unknown): boolean {
        return !!body && typeof body === 'object' && Object.keys(body).length > 0;
    }
}
