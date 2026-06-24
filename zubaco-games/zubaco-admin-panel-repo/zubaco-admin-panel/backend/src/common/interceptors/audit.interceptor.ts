import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Logs all admin write operations (POST, PUT, PATCH, DELETE) to the audit_logs table.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only audit write operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    // Skip auth endpoints
    if (request.path?.includes('/auth/')) {
      return next.handle();
    }

    const adminId = request.session?.adminId || request.user?.id || 'unknown';
    const action = `${method} ${request.path}`;
    const entity = this.extractEntity(request.path);
    const entityId = request.params?.id || request.params?.seasonId || request.params?.stageId || null;
    const changes = method === 'DELETE' ? null : (request.body || null);

    return next.handle().pipe(
      tap({
        next: () => {
          // Fire and forget — don't block the response
          this.prisma.auditLog.create({
            data: {
              admin_id: adminId,
              action,
              entity,
              entity_id: entityId,
              changes: changes ? JSON.parse(JSON.stringify(changes)) : undefined,
              ip_address: request.ip || request.headers['x-forwarded-for'] || null,
            },
          }).catch(() => { /* audit failure should never crash the app */ });
        },
      }),
    );
  }

  private extractEntity(path: string): string {
    // Extract entity from path: /admin/users/123 → users
    const parts = path.replace(/^\/admin\//, '').split('/');
    return parts[0] || 'unknown';
  }
}
