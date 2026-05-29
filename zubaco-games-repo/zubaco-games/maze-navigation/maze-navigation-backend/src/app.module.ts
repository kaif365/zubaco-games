import { join } from "path";

import { config } from "@common/config/env.config";
import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ServeStaticModule } from "@nestjs/serve-static";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";

import { AdminModule } from "./admin/admin.module";
import { TransactionInterceptor } from "./common/interceptors/transaction.interceptor";
import { LanguageMiddleware } from "./common/middleware/language.middleware";
import { LoggerMiddleware } from "./common/middleware/logger.middleware";
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { PrismaModule } from "./common/prisma/prisma.module";
import { CryptoModule } from "./crypto/crypto.module";
import { DecryptionMiddleware } from "./crypto/decryption.middleware";
import { EncryptionInterceptor } from "./crypto/encryption.interceptor";
import { GameModule } from "./game/game.module";
import { RedisModule } from "./redis/redis.module";
import { ServerModule } from "./server/server.module";
import { DemoModule } from "./user/demo/demo.module";
import { EventsModule } from "./events/events.module";
import { UserModule } from "./user/user.module";
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
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), "public"),
      serveRoot: "/public",
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: "game",
          ttl: config.throttle.ttlMs,
          limit: config.throttle.gameLimit,
        },
        {
          name: "default",
          ttl: config.throttle.ttlMs,
          limit: config.throttle.defaultLimit,
        },
      ],
    }),
    CryptoModule,
    RedisModule,
    GameModule,
    AdminModule,
    UserModule,
    DemoModule,
    ServerModule,
    EventsModule,
    AppLoggerModule,
        MetricsModule,
  ],

  providers: [
    ...(config.throttle.enabled
      ? [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
      : []),
    {
      provide: APP_INTERCEPTOR,
      useClass: EncryptionInterceptor,
    },
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
  /**
   * Configure application middleware.
   *
   * @param {MiddlewareConsumer} consumer - consumer value.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware, LoggerMiddleware, LanguageMiddleware).forRoutes("*");
    consumer
      .apply(DecryptionMiddleware)
      .forRoutes("v1/game/*", "v1/user/demo/*");
  }
}
