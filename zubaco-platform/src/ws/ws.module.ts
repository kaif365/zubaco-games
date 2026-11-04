import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TournamentGateway } from './tournament.gateway';
import { ReconnectionGraceService } from './reconnection-grace.service';
import { RedisModule } from '../common/redis/redis.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { EventsModule } from '../events/events.module';
import { config } from '../config';

@Module({
  imports: [
    RedisModule,
    PrismaModule,
    EventsModule,
    JwtModule.register({
      secret: config.jwt.accessSecret,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  providers: [TournamentGateway, ReconnectionGraceService],
  exports: [TournamentGateway, ReconnectionGraceService],
})
export class WsModule {}
