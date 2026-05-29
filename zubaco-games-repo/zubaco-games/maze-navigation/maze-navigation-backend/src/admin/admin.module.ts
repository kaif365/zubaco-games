import { SessionGuard } from "@common/guards/session.guard";
import { HttpModule } from "@nestjs/axios";
import { Global, Module } from "@nestjs/common";

import { AdminService } from "./admin.service";
import { AdminHttpService } from "./http/admin-http.service";
import { LevelController } from "./level/level.controller";
import { LevelService } from "./level/level.service";
import { MazeConfigController } from "./maze-config/maze-config.controller";
import { MazeConfigService } from "./maze-config/maze-config.service";
import { MazeTemplateController } from "./maze-template/maze-template.controller";
import { MazeTemplateService } from "./maze-template/maze-template.service";
import { StageConfigController } from "./stage-config/stage-config.controller";
import { StageConfigService } from "./stage-config/stage-config.service";

@Global()
@Module({
  imports: [HttpModule],
  controllers: [
    LevelController,
    MazeConfigController,
    StageConfigController,
    MazeTemplateController,
  ],
  providers: [
    AdminService,
    AdminHttpService,
    LevelService,
    MazeConfigService,
    StageConfigService,
    MazeTemplateService,
    SessionGuard,
  ],
  exports: [AdminService, SessionGuard, StageConfigService],
})
export class AdminModule {}
