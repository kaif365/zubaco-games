import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { appConfig } from '../config/app.config';

export interface JwtPayload {
  sub: string;
  sessionId?: string;
  [key: string]: unknown;
}

@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const auth = request.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) throw new UnauthorizedException('Missing token');
    try {
      const decoded = jwt.verify(auth.slice(7), appConfig.jwtSecret) as JwtPayload;
      request.user = decoded;
      return true;
    } catch { throw new UnauthorizedException('Invalid token'); }
  }
}
