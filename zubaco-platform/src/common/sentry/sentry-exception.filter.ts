import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SentryService } from './sentry.service';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  constructor(private readonly sentry: SentryService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : (exception as Error)?.message || 'Internal server error';

    // Log & capture 5xx server errors in Sentry with sanitized context
    if (status >= 500) {
      const errorId = this.sentry.captureException(exception, {
        path: request?.url,
        method: request?.method,
        headers: request?.headers,
        body: request?.body,
      });

      return response.status(status).json({
        statusCode: status,
        message: 'Internal server error',
        errorId,
        timestamp: new Date().toISOString(),
      });
    }

    // 4xx errors are client errors, returned directly without APM noise
    return response.status(status).json(
      typeof message === 'object'
        ? message
        : { statusCode: status, message, timestamp: new Date().toISOString() },
    );
  }
}

