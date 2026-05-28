import { Module } from "@nestjs/common";

import { AdminModule } from "../../admin/admin.module";
import { GameSessionGuard } from "../../common/guards/game-session.guard";
import { GameModule } from "../../game/game.module";
import { UserModule } from "../user.module";

import { DemoController } from "./demo.controller";
import { DemoService } from "./demo.service";

@Module({
  imports: [AdminModule, GameModule, UserModule],
  controllers: [DemoController],
  providers: [DemoService, GameSessionGuard],
})
export class DemoModule {}
