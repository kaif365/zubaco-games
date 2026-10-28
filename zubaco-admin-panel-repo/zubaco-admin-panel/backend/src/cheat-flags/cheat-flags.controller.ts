import { REQUEST_CONTEXT } from '@common/constants';
import { RequireSession, TOKEN_TYPES, USER_TYPES } from '@common/decorators/session.decorator';
import { Controller, Get, Post, Param, Body, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { CheatFlagsService } from './cheat-flags.service';
import { ListCheatFlagsDto } from './dto/list-cheat-flags.dto';

@ApiTags('Admin Cheat Flags')
@ApiBearerAuth('authorization')
@RequireSession({ tokenTypes: [TOKEN_TYPES.LOGIN], userTypes: [USER_TYPES.ADMIN] })
@Controller('admin/cheat-flags')
export class CheatFlagsController {
    constructor(private readonly cheatFlagsService: CheatFlagsService) {}

    @Get()
    @ApiOperation({ summary: 'List cheat flags with optional filters' })
    listCheatFlags(@Query() query: ListCheatFlagsDto) {
        return this.cheatFlagsService.listCheatFlags(query);
    }

    @Post(':id/dismiss')
    @ApiOperation({ summary: 'Dismiss a cheat flag (false positive)' })
    dismissFlag(
        @Param('id') flagId: string,
        @Body() body: { admin_id?: string } | undefined,
        @Req() req: Request,
    ) {
        const session = req[REQUEST_CONTEXT.SESSION] as { userId?: string } | undefined;
        const adminId = body?.admin_id || session?.userId || 'admin';
        return this.cheatFlagsService.reviewFlag(flagId, adminId, 'dismiss');
    }

    @Post(':id/warn')
    @ApiOperation({ summary: 'Warn user for a cheat flag' })
    warnFlag(
        @Param('id') flagId: string,
        @Body() body: { admin_id?: string } | undefined,
        @Req() req: Request,
    ) {
        const session = req[REQUEST_CONTEXT.SESSION] as { userId?: string } | undefined;
        const adminId = body?.admin_id || session?.userId || 'admin';
        return this.cheatFlagsService.reviewFlag(flagId, adminId, 'warn');
    }

    @Post(':id/ban')
    @ApiOperation({ summary: 'Ban user for a cheat flag' })
    banFlag(
        @Param('id') flagId: string,
        @Body() body: { admin_id?: string } | undefined,
        @Req() req: Request,
    ) {
        const session = req[REQUEST_CONTEXT.SESSION] as { userId?: string } | undefined;
        const adminId = body?.admin_id || session?.userId || 'admin';
        return this.cheatFlagsService.reviewFlag(flagId, adminId, 'ban');
    }

    @Post('users/:userId/unban')
    @ApiOperation({ summary: 'Unban a user' })
    unbanUser(@Param('userId') userId: string) {
        return this.cheatFlagsService.unbanUser(userId);
    }

    @Post('users/:userId/reset-risk')
    @ApiOperation({ summary: 'Reset a user risk score to 0' })
    resetRiskScore(@Param('userId') userId: string) {
        return this.cheatFlagsService.resetRiskScore(userId);
    }

    @Get('users/:userId/risk-score')
    @ApiOperation({ summary: 'Get user risk score and penalty tier' })
    getUserRiskScore(@Param('userId') userId: string) {
        return this.cheatFlagsService.getUserRiskScore(userId);
    }
}
