import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';

export const HMAC_VERIFY_METADATA = 'verifyHmac';

@Injectable()
export class HmacGuard implements CanActivate {
  private readonly secret: string;
  private readonly maxAge: number;

  constructor(private readonly reflector: Reflector) {
    this.secret = process.env.HMAC_SECRET || 'dev-hmac-secret';
    this.maxAge = 30000; // 30 second window
  }

  canActivate(context: ExecutionContext): boolean {
    const requireHmac = this.reflector.getAllAndOverride<boolean>(HMAC_VERIFY_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requireHmac) return true;

    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-signature'];
    const timestamp = request.headers['x-timestamp'];

    if (!signature || !timestamp) {
      throw new BadRequestException('Missing signature headers');
    }

    const ts = parseInt(timestamp as string, 10);
    if (isNaN(ts) || Math.abs(Date.now() - ts) > this.maxAge) {
      throw new BadRequestException('Request expired');
    }

    const body = JSON.stringify(request.body || {});
    const payload = `${timestamp}.${body}`;
    const expected = crypto
      .createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature as string), Buffer.from(expected))) {
      throw new BadRequestException('Invalid signature');
    }

    return true;
  }
}
