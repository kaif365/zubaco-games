import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { CryptoService } from './crypto.service';
import { SKIP_ENCRYPTION_METADATA_KEY } from './skip-encryption.decorator';

function handleAsObservable(next: CallHandler<unknown>): Observable<unknown> {
    return next.handle() as Observable<unknown>;
}

@Injectable()
export class EncryptionInterceptor implements NestInterceptor {
    constructor(
        private readonly cryptoService: CryptoService,
        private readonly reflector: Reflector,
    ) {}

    /**
     * Encrypts eligible HTTP responses before they are sent to the client.
     * @param {ExecutionContext} context - The Nest execution context.
     * @param {CallHandler<unknown>} next - The next handler in the interceptor chain.
     * @returns {Observable<unknown>} The encrypted or passthrough response stream.
     */
    intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
        // Nest's CallHandler API is typed with `any`, so we narrow it locally.
        /* eslint-disable @typescript-eslint/unbound-method */
        const handle = next.handle;
        /* eslint-enable @typescript-eslint/unbound-method */

        if (context.getType() !== 'http') {
            return handleAsObservable(next);
        }

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
            return handle();
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const response$ = handleAsObservable(next);

        /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
        return response$.pipe(
            map((data) => {
                response.setHeader('X-Payload-Encrypted', 'true');
                return this.cryptoService.encrypt(data);
            }),
        );
        /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    }

    /**
     * Checks whether encryption should be skipped for a request path.
     * @param {string} path - The request path.
     * @returns {boolean} Whether encryption should be skipped.
     */
    private shouldSkipPath(path: string): boolean {
        return path.startsWith('/api') || path.startsWith('/public');
    }
}
