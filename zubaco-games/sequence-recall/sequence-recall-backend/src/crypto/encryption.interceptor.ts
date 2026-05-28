import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { CryptoService } from './crypto.service';
import { SKIP_ENCRYPTION_METADATA_KEY } from './skip-encryption.decorator';

@Injectable()
export class EncryptionInterceptor implements NestInterceptor {
    constructor(
        private readonly cryptoService: CryptoService,
        private readonly reflector: Reflector,
    ) {}

    /**
     * Intercept.
     *
     * @param {ExecutionContext} context - The context.
     * @param {CallHandler<unknown>} next - The next.
     *
     * @returns {Observable<unknown>} The result of intercept.
     */
    intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
        if (context.getType() !== 'http') {
            return (next as { handle: () => Observable<unknown> }).handle();
        }
        const stream = (next as { handle: () => Observable<unknown> }).handle();

        const request = context.switchToHttp().getRequest<Request & { path?: string }>();
        const response = context
            .switchToHttp()
            .getResponse<{ setHeader(name: string, value: string): void }>();
        const skipByMetadata = this.reflector.getAllAndOverride<boolean>(
            SKIP_ENCRYPTION_METADATA_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (
            !this.cryptoService.isEnabled() ||
            skipByMetadata ||
            this.shouldSkipPath(request.path ?? '')
        ) {
            return stream;
        }

        return stream.pipe(
            map((data) => {
                response.setHeader('X-Payload-Encrypted', 'true');
                return this.cryptoService.encrypt(data);
            }),
        );
    }

    /**
     * Should skip path.
     *
     * @param {string} path - The path.
     *
     * @returns {boolean} The result of shouldSkipPath.
     */
    private shouldSkipPath(path: string): boolean {
        return path.startsWith('/api') || path.startsWith('/public');
    }
}
