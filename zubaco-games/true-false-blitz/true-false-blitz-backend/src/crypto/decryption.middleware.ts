import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CryptoService } from './crypto.service';

@Injectable()
export class DecryptionMiddleware implements NestMiddleware {
  constructor(private readonly cryptoService: CryptoService) {}

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
        throw new BadRequestException('INVALID_ENCRYPTED_PAYLOAD');
      }

      req.body = this.cryptoService.decrypt(req.body) as Record<string, unknown>;
      (req as Request & { wasEncrypted?: boolean }).wasEncrypted = true;
      next();
    } catch {
      next(new BadRequestException('INVALID_ENCRYPTED_PAYLOAD'));
    }
  }

  private hasBody(body: unknown): boolean {
    return !!body && typeof body === 'object' && Object.keys(body).length > 0;
  }
}
