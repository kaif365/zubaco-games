import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FreePlayModule } from './free-play/free-play.module';
import { TournamentModule } from './tournament/tournament.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { WalletModule } from './wallet/wallet.module';
import { SocialModule } from './social/social.module';
import { NotificationModule } from './notification/notification.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { LoggerModule } from './common/logger/logger.module';
import { GameSessionModule } from './game-session/game-session.module';
import { AntiCheatModule } from './anti-cheat/anti-cheat.module';
import { ComplianceModule } from './compliance/compliance.module';
import { WebhookModule } from './webhook/webhook.module';
import { EventsModule } from './events/events.module';
import { AdminModule } from './admin/admin.module';
import { HealthController } from './health.controller';
import { AppVersionController } from './app-version.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // SEC-S1 (F1): global default throttle. The `skipIf` disables HTTP rate
    // limiting only inside the automated test harness (both the e2e and
    // integration bootstraps set NODE_ENV=test); dev and production remain
    // fully rate-limited. Per-route @Throttle() decorators (OTP send/verify,
    // login, deposit, withdraw) are only enforced because ThrottlerGuard is
    // now bound as an APP_GUARD below.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 100 }],
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    ScheduleModule.forRoot(),
    LoggerModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    FreePlayModule,
    TournamentModule,
    LeaderboardModule,
    WalletModule,
    SocialModule,
    NotificationModule,
    GameSessionModule,
    AntiCheatModule,
    ComplianceModule,
    WebhookModule,
    EventsModule,
    AdminModule,
  ],
  controllers: [HealthController, AppVersionController],
  providers: [
    // SEC-S1 (F1): bind the throttler globally so the pre-existing @Throttle()
    // route limits (and the global default) are actually enforced. Without this
    // guard binding the ThrottlerModule was inert and no 429 was ever returned.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
