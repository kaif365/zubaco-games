import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { RestateEndpointService } from './restate-endpoint.service';

@Module({
  imports: [GameModule],
  providers: [RestateEndpointService],
})
export class RestateModule {}
