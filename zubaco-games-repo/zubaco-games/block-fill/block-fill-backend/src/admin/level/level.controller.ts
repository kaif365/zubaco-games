import { TOKEN_TYPES, USER_TYPES, STATUS_CODES } from '@common/constants';
import { RequireSession } from '@common/decorators/session.decorator';
import { Transactional } from '@common/decorators/transactional.decorator';
import { SessionGuard } from '@common/guards/session.guard';
import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Query,
    HttpCode,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { SkipEncryption } from '../../crypto/skip-encryption.decorator';

import { CreateLevelDto } from './dto/create-level.dto';
import { DeleteLevelsDto } from './dto/delete-levels.dto';
import { ListLevelsDto } from './dto/list-levels.dto';
import { UpdateLevelDto } from './dto/update-level.dto';
import { LevelService } from './level.service';

@ApiTags('Admin — Levels')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('v1/levels')
export class LevelController {
    constructor(private readonly levelService: LevelService) {}

    @Post()
    @HttpCode(STATUS_CODES.CREATED)
    @SkipEncryption()
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    @Transactional()
    create(@Body() dto: CreateLevelDto) {
        return this.levelService.create(dto);
    }

    @Put()
    @SkipEncryption()
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    @Transactional()
    update(@Body() dto: UpdateLevelDto) {
        return this.levelService.update(dto);
    }

    @Delete()
    @SkipEncryption()
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    @Transactional()
    remove(@Body() dto: DeleteLevelsDto) {
        return this.levelService.remove(dto);
    }

    @Get()
    @SkipEncryption()
    @RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
    @Transactional({ readOnly: true })
    list(@Query() dto: ListLevelsDto) {
        return this.levelService.list(dto);
    }
}
