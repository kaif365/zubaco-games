import { AwsModule } from "@aws/aws.module";
import { AdminAuthGuard } from "@common/guards/admin-auth.guard";
import { Module } from "@nestjs/common";

import { RedisModule } from "../redis/redis.module";

import { AdminService } from "./admin.service";
import { DifficultyController } from "./difficulty/difficulty.controller";
import { DifficultyService } from "./difficulty/difficulty.service";
import { FileController } from "./file/file.controller";
import { FileService } from "./file/file.service";
import { AdminHttpService } from "./http/admin-http.service";
import { LevelController } from "./level/level.controller";
import { LevelService } from "./level/level.service";
import { StageConfigEventsService } from "./stage-config/stage-config-events.service";
import { StageConfigController } from "./stage-config/stage-config.controller";
import { StageConfigService } from "./stage-config/stage-config.service";

@Module({
  imports: [AwsModule, RedisModule],
  controllers: [
    DifficultyController,
    LevelController,
    StageConfigController,
    FileController,
  ],
  providers: [
    AdminService,
    AdminHttpService,
    DifficultyService,
    LevelService,
    StageConfigService,
    StageConfigEventsService,
    FileService,
    AdminAuthGuard,
  ],
  exports: [
    AdminService,
    DifficultyService,
    LevelService,
    StageConfigService,
    FileService,
  ],
})
export class AdminModule {}
