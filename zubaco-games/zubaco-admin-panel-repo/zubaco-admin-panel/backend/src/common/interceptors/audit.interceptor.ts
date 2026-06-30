import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '@common/prisma/prisma.service';
import { REQUEST_CONTEXT } from '@common/constants';

/**
 * Logs admin write operations (POST, PUT, PATCH, DELETE) plus sensitive exports
 * (PII/financial CSV reads) to the audit_logs table.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    const isWrite = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const isSensitiveRead = method === 'GET' && request.path?.includes('/exports/');

    // Only audit writes and sensitive exports; never audit auth endpoints.
    if (!isWrite && !isSensitiveRead) {
      return next.handle();
    }
    if (request.path?.includes('/auth/')) {
      return next.handle();
    }

    // Resolve the acting admin from the request context populated by SessionGuard.
    const session = request[REQUEST_CONTEXT.SESSION];
    const admin = request[REQUEST_CONTEXT.ADMIN];
    const adminId: string | undefined = admin?.id || session?.userId;
    const action = `${method} ${request.path}`;
    const entity = this.extractEntity(request.path);
    const entityId = request.params?.id || request.params?.userId || request.params?.seasonId || request.params?.stageId || null;
    const changes = method === 'DELETE' || method === 'GET' ? null : (request.body || null);

    return next.handle().pipe(
      tap({
        next: () => {
          if (!adminId) {
            // No authenticated admin (e.g. rejected request) — admin_id is a required FK; skip.
            return;
          }
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
