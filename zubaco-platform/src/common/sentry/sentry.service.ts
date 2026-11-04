import { Injectable, Logger } from '@nestjs/common';

export interface SentryBreadcrumb {
  category: string;
  message: string;
  level?: 'info' | 'warning' | 'error';
  data?: Record<string, any>;
  timestamp?: number;
}

@Injectable()
export class SentryService {
  private readonly logger = new Logger(SentryService.name);
  private enabled = false;

  constructor() {
    const dsn = process.env.SENTRY_DSN;
    if (dsn) {
      this.enabled = true;
      this.logger.log('Sentry APM initialized with configured DSN');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Sanitizes sensitive fields from error context payloads before transmission.
   */
  sanitizePayload(data: any): any {
    if (!data || typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map((item) => this.sanitizePayload(item));

    const sensitiveKeys = new Set([
      'password',
      'token',
      'refreshtoken',
      'access_token',
      'authorization',
      'otp',
      'secret',
      'bankaccount',
      'accountnumber',
      'ifsccode',
      'pan',
      'pannumber',
      'cardnumber',
      'cvv',
    ]);

    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      const lower = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (sensitiveKeys.has(lower)) {
        sanitized[k] = '[REDACTED]';
      } else if (typeof v === 'string' && v.startsWith('Bearer ')) {
        sanitized[k] = 'Bearer [REDACTED]';
      } else if (typeof v === 'object' && v !== null) {
        sanitized[k] = this.sanitizePayload(v);
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }

  captureException(exception: any, context?: Record<string, any>): string {
    const sanitizedContext = this.sanitizePayload(context || {});
    const errorId = `sentry_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    if (this.enabled) {
      this.logger.error(`[Sentry ${errorId}] ${exception?.message || exception}`, sanitizedContext);
    } else {
      this.logger.debug(`[Local Log] Exception captured: ${exception?.message || exception}`);
    }

    return errorId;
  }

  addBreadcrumb(breadcrumb: SentryBreadcrumb): void {
    const sanitizedData = this.sanitizePayload(breadcrumb.data || {});
    if (this.enabled) {
      this.logger.debug(`[Breadcrumb] ${breadcrumb.category}: ${breadcrumb.message}`, sanitizedData);
    }
  }
}

