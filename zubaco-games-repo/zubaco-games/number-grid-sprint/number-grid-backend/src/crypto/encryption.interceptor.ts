import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CryptoService } from './crypto.service';
import { ENABLE_ENCRYPTION_KEY } from './enable-encryption.decorator';

@Injectable()
export class EncryptionInterceptor implements NestInterceptor {
  constructor(
    private readonly cryptoService: CryptoService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const enabled = this.reflector.getAllAndOverride<boolean>(ENABLE_ENCRYPTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!this.cryptoService.isEnabled() || !enabled) return next.handle();

    const request = context.switchToHttp().getRequest<{ body?: unknown; wasEncrypted?: boolean }>();
    const hasBody =
      !!request.body && typeof request.body === 'object' && Object.keys(request.body).length > 0;

    if (hasBody && !request.wasEncrypted) {
      throw new BadRequestException('REQUEST_MUST_BE_ENCRYPTED');
    }

    const response = context
      .switchToHttp()
      .getResponse<{ setHeader(name: string, value: string): void }>();

    return next.handle().pipe(
      map((data) => {
        response.setHeader('X-Payload-Encrypted', 'true');
        return this.cryptoService.encrypt(data);
      }),
    );
  }
}
