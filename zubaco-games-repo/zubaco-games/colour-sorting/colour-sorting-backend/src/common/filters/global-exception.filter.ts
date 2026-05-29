import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  correlationId?: string;
  timestamp: string;
  path: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? this.extractMessage(exception)
        : 'Internal server error';

    const errorName =
      exception instanceof HttpException
        ? exception.name
        : 'InternalServerError';

    const correlationId = request.headers['x-correlation-id'] as string;

    const errorResponse: ErrorResponse = {
      statusCode,
      message,
      error: errorName,
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (statusCode >= 500) {
      this.logger.error(
        {
          statusCode,
          path: request.url,
          method: request.method,
          correlationId,
          stack: exception instanceof Error ? exception.stack : undefined,
        },
        `Unhandled exception: ${message}`,
      );
    } else {
      this.logger.warn(
        { statusCode, path: request.url, method: request.method, correlationId },
        `Client error: ${message}`,
      );
    }

    response.status(statusCode).json(errorResponse);
  }

  private extractMessage(exception: HttpException): string {
    const response = exception.getResponse();
    if (typeof response === 'string') return response;
    if (typeof response === 'object' && response !== null) {
      const resp = response as Record<string, unknown>;
      if (Array.isArray(resp.message)) return resp.message.join('; ');
      if (typeof resp.message === 'string') return resp.message;
    }
    return exception.message;
  }
}
