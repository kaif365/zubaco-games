import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class InternalApiGuard implements CanActivate {
  private readonly apiKey: string;

  constructor() {
    const key = process.env.INTERNAL_API_KEY;
    if (!key) {
      throw new Error('FATAL: INTERNAL_API_KEY environment variable is required');
    }
    this.apiKey = key;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const providedKey = request.headers['x-internal-api-key'];

    if (typeof providedKey !== 'string' || !this.safeEqual(providedKey, this.apiKey)) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    return true;
  }

  private safeEqual(provided: string, expected: string): boolean {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
}
