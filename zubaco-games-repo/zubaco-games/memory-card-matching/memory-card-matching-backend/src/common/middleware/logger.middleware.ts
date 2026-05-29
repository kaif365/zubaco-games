import { Injectable, Logger, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");

  use(request: Request, response: Response, next: NextFunction): void {
    const { ip, method, originalUrl } = request;
    const userAgent = request.get("user-agent") || "";
    const startedAt = Date.now();

    response.on("finish", () => {
      const { statusCode } = response;
      const contentLength = response.get("content-length") || "-";
      const durationMs = Date.now() - startedAt;

      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${contentLength} - ${userAgent} ${ip} - ${durationMs}ms`,
      );
    });

    next();
  }
}
