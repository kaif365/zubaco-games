import { TOKEN_TYPES, USER_TYPES } from '@common/constants';
import { RequireSession } from '@common/decorators/session.decorator';
import { Transactional } from '@common/decorators/transactional.decorator';
import { SessionGuard } from '@common/guards/session.guard';
import { Controller, Get, Put, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { SkipEncryption } from '../../crypto/skip-encryption.decorator';

import { DeleteStageConfigsDto } from './dto/delete-stage-configs.dto';
import { ListStageConfigsDto } from './dto/list-stage-configs.dto';
import { UpsertStageConfigDto } from './dto/upsert-stage-config.dto';
import { StageConfigService } from './stage-config.service';

@ApiTags('Admin — Stage Configs')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('v1/stage-configs')
export class StageConfigController {
    constructor(private readonly stageConfigService: StageConfigService) {}

    @Put()
    @SkipEncryption()
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    @Transactional()
    upsert(@Body() dto: UpsertStageConfigDto) {
        return this.stageConfigService.upsert(dto);
    }

    @Delete()
    @SkipEncryption()
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    @Transactional()
    remove(@Body() dto: DeleteStageConfigsDto) {
        return this.stageConfigService.remove(dto);
    }

    @Get()
    @SkipEncryption()
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    @Transactional({ readOnly: true })
    list(@Query() dto: ListStageConfigsDto) {
        return this.stageConfigService.list(dto);
    }
}
