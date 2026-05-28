import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { BullModule } from '@nestjs/bullmq';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';
import { QueueHealthIndicator } from './queue.health';
import { PrismaModule } from '../common/prisma/prisma.module';
import { QUEUE_NAMES } from '../queue/queue.constants';

@Module({
  imports: [TerminusModule, PrismaModule, BullModule.registerQueue({ name: QUEUE_NAMES.GAME_EVENTS })],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, RedisHealthIndicator, QueueHealthIndicator],
})
export class HealthModule {}