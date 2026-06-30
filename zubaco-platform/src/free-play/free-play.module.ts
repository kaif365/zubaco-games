import { Module } from '@nestjs/common';
import { FreePlayController } from './free-play.controller';
import { FreePlayService } from './free-play.service';
import { EnergyService } from './energy.service';
import { UsersModule } from '../users/users.module';
import { RngModule } from '../rng/rng.module';
import { GameSessionModule } from '../game-session/game-session.module';

@Module({
  imports: [UsersModule, RngModule, GameSessionModule],
  controllers: [FreePlayController],
  providers: [FreePlayService, EnergyService],
  exports: [FreePlayService, EnergyService],
})
export class FreePlayModule {}
