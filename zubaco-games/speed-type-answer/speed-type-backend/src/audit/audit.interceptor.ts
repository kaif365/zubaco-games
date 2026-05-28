import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

const REDACTED_HEADERS = ['authorization', 'x-api-key', 'cookie', 'x-signature'];
const REDACTED_BODY_FIELDS = ['password', 'token', 'secret', 'creditCard', 'ssn'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditLog');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();
    const { method, url, ip, headers, body } = request;

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - startTime;

          this.logger.log({
            type: 'AUDIT',
            method,
            url,
            statusCode: response.statusCode,
            duration,
            ip,
            userId: request.user?.sub || request.user?.id || 'anonymous',
            correlationId: headers['x-correlation-id'] || 'none',
            userAgent: headers['user-agent'],
            headers: this.redactHeaders(headers),
            body: this.redactBody(body),
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.warn({
            type: 'AUDIT_ERROR',
            method,
            url,
            statusCode: error.status || 500,
            duration,
            ip,
            userId: request.user?.sub || request.user?.id || 'anonymous',
            correlationId: headers['x-correlation-id'] || 'none',
            error: error.message,
          });
        },
      }),
    );
  }

  private redactHeaders(headers: Record<string, string>): Record<string, string> {
    const redacted: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      redacted[key] = REDACTED_HEADERS.includes(key.toLowerCase()) ? '[REDACTED]' : String(value);
    }
    return redacted;
  }

  private redactBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;
    const redacted = { ...(body as Record<string, unknown>) };
    for (const field of REDACTED_BODY_FIELDS) {
      if (field in redacted) redacted[field] = '[REDACTED]';
    }
    return redacted;
  }
}
