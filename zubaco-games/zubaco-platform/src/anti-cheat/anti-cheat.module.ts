import { Module } from '@nestjs/common';
import { AntiCheatController } from './anti-cheat.controller';
import { AntiCheatService } from './anti-cheat.service';
import { DeviceDetectionService } from './device-detection.service';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [AntiCheatController],
  providers: [AntiCheatService, DeviceDetectionService],
  exports: [AntiCheatService, DeviceDetectionService],
})
export class AntiCheatModule {}
