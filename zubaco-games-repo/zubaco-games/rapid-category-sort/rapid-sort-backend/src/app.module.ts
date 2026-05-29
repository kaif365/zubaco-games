import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_PIPE, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ZodValidationPipe } from 'nestjs-zod';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GameModule } from './game/game.module';
import { CryptoModule } from './crypto/crypto.module';
import { RestateModule } from './restate/restate.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { DecryptionMiddleware } from './crypto/decryption.middleware';
import { EncryptionInterceptor } from './crypto/encryption.interceptor';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { UserThrottlerGuard } from './common/guards/user-throttler.guard';
import { MetricsModule } from './common/metrics/metrics.module';
import { AppLoggerModule } from './common/logger/logger.module';
import { MetricsInterceptor } from './common/metrics/metrics.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { RedisModule } from './redis/redis.module';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { HmacGuard } from './common/guards/hmac.guard';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { QueueModule } from './queue/queue.module';
import { WsModule } from './ws/ws.module';
import { ShutdownModule } from './shutdown/shutdown.module';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { CircuitBreakerModule } from './circuit-breaker/circuit-breaker.module';
import { AuditModule } from './audit/audit.module';
import { HttpCacheModule } from './http-cache/http-cache.module';
import { TracingModule } from './tracing/tracing.module';
import { SecretsModule } from './secrets/secrets.module';
import { HardeningModule } from './hardening/hardening.module';


@Module({
  imports: [
        HardeningModule,
        SecretsModule,
        TracingModule,
        HttpCacheModule,
        AuditModule,
        CircuitBreakerModule,
        IdempotencyModule,
        FeatureFlagsModule,
        ShutdownModule,
        WsModule,
    RedisModule,
    QueueModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    GameModule,
    CryptoModule,
    RestateModule,
    EventsModule,
    HealthModule,
    AppLoggerModule,
    MetricsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
    { provide: APP_GUARD, useClass: ApiKeyGuard },
    { provide: APP_GUARD, useClass: HmacGuard },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: EncryptionInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
    consumer.apply(DecryptionMiddleware).forRoutes('*');
  }
}
