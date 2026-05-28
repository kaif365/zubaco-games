import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class IpRateLimiterMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IpRateLimiterMiddleware.name);
  private readonly store = new Map<string, RateEntry>();
  private readonly windowMs = 60_000; // 1 minute
  private readonly maxRequests = parseInt(process.env.IP_RATE_LIMIT || '200', 10);

  use(req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = this.store.get(ip);

    if (!entry || now > entry.resetAt) {
      this.store.set(ip, { count: 1, resetAt: now + this.windowMs });
      this.setHeaders(res, 1);
      return next();
    }

    entry.count++;

    if (entry.count > this.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      this.logger.warn(`Rate limit exceeded for IP: ${ip}`);
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    this.setHeaders(res, entry.count);
    next();
  }

  private setHeaders(res: Response, count: number): void {
    res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - count).toString());
  }
}
