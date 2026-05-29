import { Module } from "@nestjs/common";

import { AdminModule } from "../admin/admin.module";
import { AwsModule } from "../aws/aws.module";
import { GameSessionGuard } from "../common/guards/game-session.guard";
import { UserModule } from "../user/user.module";

import { GameExpiryService } from "./game-expiry.service";
import { GameRestateEndpointService } from "./game-restate-endpoint.service";
import { GameSessionRestateService } from "./game-session-restate.service";
import { GameController } from "./game.controller";
import { GameService } from "./game.service";

/**
 * Module for player-facing memory-card gameplay flows.
 */
@Module({
  imports: [AdminModule, AwsModule, UserModule],
  controllers: [GameController],
  providers: [
    GameSessionGuard,
    GameService,
    GameExpiryService,
    GameSessionRestateService,
    GameRestateEndpointService,
  ],
  exports: [GameService],
})
export class GameModule {}
