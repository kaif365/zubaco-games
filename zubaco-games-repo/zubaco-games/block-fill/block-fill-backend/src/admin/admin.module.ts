import { SessionGuard } from '@common/guards/session.guard';
import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';

import { AdminService } from './admin.service';
import { BoardController } from './board/board.controller';
import { BoardService } from './board/board.service';
import { AdminHttpService } from './http/admin-http.service';
import { LevelController } from './level/level.controller';
import { LevelService } from './level/level.service';
import { StageConfigController } from './stage-config/stage-config.controller';
import { StageConfigService } from './stage-config/stage-config.service';

@Global()
@Module({
    imports: [HttpModule],
    controllers: [LevelController, BoardController, StageConfigController],
    providers: [
        AdminService,
        AdminHttpService,
        LevelService,
        BoardService,
        StageConfigService,
        SessionGuard,
    ],
    exports: [AdminService, SessionGuard],
})
export class AdminModule {}
