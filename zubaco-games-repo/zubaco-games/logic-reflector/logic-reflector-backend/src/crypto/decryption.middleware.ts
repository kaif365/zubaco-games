import {
  BadRequestException,
  Injectable,
  NestMiddleware,
} from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

import { CryptoService } from "./crypto.service";

@Injectable()
export class DecryptionMiddleware implements NestMiddleware {
  /**
   * Create a new instance.
   *
   * @param {CryptoService} cryptoService - crypto service value.
   */
  constructor(private readonly cryptoService: CryptoService) {}

  /**
   * Handle the middleware request.
   *
   * @param {Request} req - req value.
   * @param {Response} _res - res value.
   * @param {NextFunction} next - next value.
   */
  use(req: Request, _res: Response, next: NextFunction): void {
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
   * Check whether body.
   *
   * @param {unknown} body - Request body to inspect.
   *
   * @returns {boolean} Whether the condition is met.
   */
  private hasBody(body: unknown): boolean {
    return !!body && typeof body === "object" && Object.keys(body).length > 0;
  }
}
