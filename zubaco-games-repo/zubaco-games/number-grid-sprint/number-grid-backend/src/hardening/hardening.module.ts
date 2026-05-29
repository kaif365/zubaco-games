import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { RequestSizeLimiterMiddleware } from './request-size-limiter.middleware';
import { IpRateLimiterMiddleware } from './ip-rate-limiter.middleware';

@Module({})
export class HardeningModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestSizeLimiterMiddleware, IpRateLimiterMiddleware)
      .forRoutes('*');
  }
}
