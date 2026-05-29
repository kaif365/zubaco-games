import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

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

    if (!providedKey || providedKey !== this.apiKey) {
      throw new UnauthorizedException('Invalid internal API key');
    }

    return true;
  }
}
