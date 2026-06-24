import { REQUEST_CONTEXT } from '@common/constants';
import { RequireSession, TOKEN_TYPES, USER_TYPES } from '@common/decorators/session.decorator';
import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';

@ApiTags('Admin Auth')
@Controller('admin/auth')
export class AdminAuthController {
    constructor(private readonly adminAuthService: AdminAuthService) {}

    @Post('login')
    @HttpCode(200)
    login(@Body() payload: AdminLoginDto) {
        return this.adminAuthService.login(payload);
    }

    @Post('logout')
    @HttpCode(200)
    @ApiBearerAuth('authorization')
    @RequireSession({
        tokenTypes: [TOKEN_TYPES.LOGIN],
        userTypes: [USER_TYPES.ADMIN],
    })
    logout(@Req() request: Request) {
        const session = request[REQUEST_CONTEXT.SESSION] as { sessionId: string; userId: string };
        return this.adminAuthService.logout(session.sessionId, session.userId);
    }

    @Get('me')
    @ApiBearerAuth('authorization')
    @RequireSession({
        tokenTypes: [TOKEN_TYPES.LOGIN],
        userTypes: [USER_TYPES.ADMIN],
    })
    me(@Req() request: Request) {
        return request[REQUEST_CONTEXT.ADMIN] as unknown;
    }
}
