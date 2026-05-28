import { AuthUser } from '@common/decorators/auth-user.decorator';
import {
    RequireSession,
    SESSION_AUTH_MODE,
    TOKEN_TYPES,
    USER_TYPES,
} from '@common/decorators/session.decorator';
import { SessionGuard } from '@common/guards/session.guard';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DemoService, type DemoResult } from './demo.service';
import { GetDemoDto } from './dto/get-demo.dto';

@ApiTags('User Demo')
@ApiBearerAuth()
@UseGuards(SessionGuard)
@Controller('v1/user/demo')
export class DemoController {
    constructor(private readonly demoService: DemoService) {}

    /**
     * Fetches or lazily generates the local demo payload for this user and stage.
     * @param {string} userId - The authenticated user identifier.
     * @param {GetDemoDto} dto - The query payload containing the stage identifier.
     * @returns {Promise<DemoResult>} The demo response grouped by configured level.
     */
    @Get()
    @RequireSession({
        tokenTypes: [TOKEN_TYPES.LOGIN],
        userTypes: [USER_TYPES.USER],
        authMode: SESSION_AUTH_MODE.PAYLOAD,
    })
    @ApiOperation({
        summary: 'Fetch or lazily generate the local demo payload for this user',
    })
    getDemo(@Query() dto: GetDemoDto, @AuthUser('userId') userId: string): Promise<DemoResult> {
        return this.demoService.getDemo(userId, dto.stageId);
    }
}
