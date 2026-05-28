import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

import { CryptoService } from "./crypto.service";
import { ENABLE_ENCRYPTION_METADATA_KEY } from "./enable-encryption.decorator";

type EncryptedRequest = {
  body?: unknown;
  wasEncrypted?: boolean;
};

/**
 * Encrypts outbound responses for routes that require protected payload transport.
 */
@Injectable()
export class EncryptionInterceptor implements NestInterceptor {
  /**
   * Create a new instance.
   *
   * @param {CryptoService} cryptoService - crypto service value.
   * @param {Reflector} reflector - reflector value.
   */
  constructor(
    private readonly cryptoService: CryptoService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Intercept the request lifecycle.
   *
   * @param {ExecutionContext} context - context value.
   * @param {CallHandler} next - next value.
   *
   * @returns {Observable<unknown>} The response stream.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Nest exposes CallHandler with an unresolved stream type here, so we
    // narrow it locally and keep the unsafe suppression scoped to this block.

    /* eslint-disable @typescript-eslint/unbound-method */
    const handle = next.handle as () => Observable<unknown>;
    /* eslint-enable @typescript-eslint/unbound-method */

    if (context.getType() !== "http") {
      return handle();
    }

    const enabled = this.reflector.getAllAndOverride<boolean>(
      ENABLE_ENCRYPTION_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!this.cryptoService.isEnabled() || !enabled) {
      return handle();
    }

    const request = context.switchToHttp().getRequest<EncryptedRequest>();
    const hasBody =
      !!request.body &&
      typeof request.body === "object" &&
      Object.keys(request.body).length > 0;

    if (hasBody && !request.wasEncrypted) {
      throw new BadRequestException("REQUEST_MUST_BE_ENCRYPTED");
    }

    const response = context
      .switchToHttp()
      .getResponse<{ setHeader(name: string, value: string): void }>();

    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    const response$ = handle();
    const encryptedResponse$ = response$.pipe(
      map((data) => {
        response.setHeader("X-Payload-Encrypted", "true");
        return this.cryptoService.encrypt(data);
      }),
    );
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

    return encryptedResponse$;
  }
}
