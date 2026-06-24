import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { HealthController } from './health.controller';
import { AppVersionController } from './app-version.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
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
  ],
  controllers: [HealthController, AppVersionController],
})
export class AppModule {}
