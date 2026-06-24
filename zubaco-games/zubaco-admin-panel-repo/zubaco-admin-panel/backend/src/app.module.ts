import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BannersModule } from './banners/banners.module';
import { CheatFlagsModule } from './cheat-flags/cheat-flags.module';
import { SessionGuard } from './common/guards/session.guard';
import { TransactionInterceptor } from './common/interceptors/transaction.interceptor';
import { LanguageMiddleware } from './common/middleware/language.middleware';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { PrismaModule } from './common/prisma/prisma.module';
import { ExportsModule } from './exports/exports.module';
import { GamesModule } from './games/games.module';
import { PrizesModule } from './prizes/prizes.module';
import { RedisModule } from './redis/redis.module';
import { SeasonsModule } from './seasons/seasons.module';
import { StagesModule } from './stages/stages.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { UsersModule } from './users/users.module';

@Module({
    imports: [
        PrismaModule,
        RedisModule,
        AdminModule,
        GamesModule,
        StagesModule,
        TournamentsModule,
        CheatFlagsModule,
        UsersModule,
        SeasonsModule,
        AnalyticsModule,
        ExportsModule,
        BannersModule,
        PrizesModule,
    ],
    providers: [
        {
            provide: APP_INTERCEPTOR,
            useClass: TransactionInterceptor,
        },
        {
            provide: APP_GUARD,
            useClass: SessionGuard,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware, LanguageMiddleware).forRoutes('*');
    }
}
