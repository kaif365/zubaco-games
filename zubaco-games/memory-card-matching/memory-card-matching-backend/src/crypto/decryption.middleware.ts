import {
  BadRequestException,
  Injectable,
  NestMiddleware,
} from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

import { CryptoService } from "./crypto.service";

type EncryptedRequest = Request & { wasEncrypted?: boolean };

/**
 * Decrypts inbound HTTP request bodies before they reach controllers.
 */
@Injectable()
export class DecryptionMiddleware implements NestMiddleware {
  /**
   * Create a new instance.
   *
   * @param {CryptoService} cryptoService - crypto service value.
   */
  constructor(private readonly cryptoService: CryptoService) {}

  /**
   * Handle middleware execution.
   *
   * @param {EncryptedRequest} req - request value.
   * @param {Response} _res - response value.
   * @param {NextFunction} next - next value.
   *
   * @returns {void} Resolves when the operation completes.
   */
  use(req: EncryptedRequest, _res: Response, next: NextFunction): void {
    if (!this.cryptoService.isEnabled() || !this.hasBody(req.body)) {
      next();
      return;
    }

    try {
      if (!this.cryptoService.hasEncryptionFields(req.body)) {
        next();
        return;
      }

      if (!this.cryptoService.isEncryptedPayload(req.body)) {
        throw new BadRequestException("INVALID_ENCRYPTED_PAYLOAD");
      }

      req.body = this.cryptoService.decrypt(req.body) as Record<
        string,
        unknown
      >;
      req.wasEncrypted = true;
      next();
    } catch {
      next(new BadRequestException("INVALID_ENCRYPTED_PAYLOAD"));
    }
  }

  /**
   * Check whether the request body has enumerable content.
   *
   * @param {unknown} body - body value.
   *
   * @returns {boolean} Whether the body contains data.
   */
  private hasBody(body: unknown): boolean {
    return !!body && typeof body === "object" && Object.keys(body).length > 0;
  }
}
