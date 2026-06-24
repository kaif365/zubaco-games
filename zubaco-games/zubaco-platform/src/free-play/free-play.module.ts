import { Module } from '@nestjs/common';
import { FreePlayController } from './free-play.controller';
import { FreePlayService } from './free-play.service';
import { EnergyService } from './energy.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [FreePlayController],
  providers: [FreePlayService, EnergyService],
  exports: [FreePlayService, EnergyService],
})
export class FreePlayModule {}
