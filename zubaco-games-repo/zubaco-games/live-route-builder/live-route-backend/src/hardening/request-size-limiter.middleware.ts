import { Injectable, NestMiddleware, PayloadTooLargeException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const MAX_BODY_SIZE = parseInt(process.env.MAX_BODY_SIZE || '1048576', 10); // 1MB default

@Injectable()
export class RequestSizeLimiterMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > MAX_BODY_SIZE) {
      throw new PayloadTooLargeException(
        `Request body exceeds maximum size of ${MAX_BODY_SIZE} bytes`,
      );
    }
    next();
  }
}
