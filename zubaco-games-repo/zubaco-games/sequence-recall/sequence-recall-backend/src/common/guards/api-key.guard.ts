import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const API_KEY_METADATA = 'requireApiKey';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly validKeys: Set<string>;

  constructor(private readonly reflector: Reflector) {
    const keys = process.env.ADMIN_API_KEYS || '';
    this.validKeys = new Set(keys.split(',').filter(Boolean));
  }

  canActivate(context: ExecutionContext): boolean {
    const requireKey = this.reflector.getAllAndOverride<boolean>(API_KEY_METADATA, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requireKey) return true;

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey || !this.validKeys.has(apiKey)) {
      throw new ForbiddenException('Invalid or missing API key');
    }

    return true;
  }
}
