import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TracingService } from './tracing.service';
import { TracingMiddleware } from './tracing.middleware';

@Global()
@Module({
  providers: [TracingService],
  exports: [TracingService],
})
export class TracingModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TracingMiddleware).forRoutes('*');
  }
}
