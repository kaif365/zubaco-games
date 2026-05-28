import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class SessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'];
    if (!auth) throw new UnauthorizedException('Missing token');
    const token = auth.replace('Bearer ', '');
    try {
      const decoded = jwt.verify(token, process.env['JWT_SECRET'] || 'dev-secret');
      req.user = decoded;
      return true;
    } catch { throw new UnauthorizedException('Invalid token'); }
  }
}
