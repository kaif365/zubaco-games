import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AdminModule } from './admin/admin.module';
import { CommonModule } from './common/common.module';
import { config } from './common/config/env.config';
import { TransactionInterceptor } from './common/interceptors/transaction.interceptor';
import { LanguageMiddleware } from './common/middleware/language.middleware';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { PrismaModule } from './common/prisma/prisma.module';
import { CryptoModule } from './crypto/crypto.module';
import { DecryptionMiddleware } from './crypto/decryption.middleware';
import { GameModule } from './game/game.module';
import { HealthModule } from './health/health.module';
import { RedisModule } from './redis/redis.module';
import { UserModule } from './user/user.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { AppLoggerModule } from './common/logger/logger.module';
import { MetricsInterceptor } from './common/metrics/metrics.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { QueueModule } from './queue/queue.module';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { HmacGuard } from './common/guards/hmac.guard';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
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
        QueueModule,
        ThrottlerModule.forRoot({
            throttlers: [
                { name: 'game', ttl: config.throttle.ttlMs, limit: config.throttle.gameLimit },
                { name: 'default', ttl: config.throttle.ttlMs, limit: config.throttle.defaultLimit },
            ],
        }),
        CommonModule,
        CryptoModule,
        RedisModule,
        GameModule,
        AdminModule,
        HealthModule,
        UserModule,
        MetricsModule,
        AppLoggerModule,
    ],
    providers: [
        ...(config.throttle.enabled
            ? [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
            : []),
        { provide: APP_GUARD, useClass: ApiKeyGuard },
        { provide: APP_GUARD, useClass: HmacGuard },
        {
            provide: APP_INTERCEPTOR,
            useClass: TransactionInterceptor,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: MetricsInterceptor,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
        consumer.apply(CorrelationIdMiddleware, LoggerMiddleware, LanguageMiddleware, DecryptionMiddleware).forRoutes('*');
    }
}
