import { Module } from '@nestjs/common';
import { FreePlayController } from './free-play.controller';
import { FreePlayService } from './free-play.service';
import { EnergyService } from './energy.service';
import { UsersModule } from '../users/users.module';
import { ScoringModule } from '../scoring/scoring.module';
import { RngModule } from '../rng/rng.module';

@Module({
  imports: [UsersModule, ScoringModule, RngModule],
  controllers: [FreePlayController],
  providers: [FreePlayService, EnergyService],
  exports: [FreePlayService, EnergyService],
})
export class FreePlayModule {}
