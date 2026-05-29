import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsService } from './metrics.service';

/**
 * Intercepts every request to track:
 * - http_requests_total (counter with method + status)
 * - http_request_duration_ms (histogram)
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const req = context.switchToHttp().getRequest();
    const method = req.method || 'UNKNOWN';

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const status = String(res.statusCode || 200);
          const duration = Date.now() - start;

          this.metrics.incrementCounter(
            'http_requests_total',
            'Total HTTP requests',
            { method, status },
          );
          this.metrics.observeHistogram(
            'http_request_duration_ms',
            'HTTP request duration in milliseconds',
            duration,
          );
        },
        error: () => {
          const duration = Date.now() - start;
          this.metrics.incrementCounter(
            'http_requests_total',
            'Total HTTP requests',
            { method, status: '500' },
          );
          this.metrics.observeHistogram(
            'http_request_duration_ms',
            'HTTP request duration in milliseconds',
            duration,
          );
        },
      }),
    );
  }
}
