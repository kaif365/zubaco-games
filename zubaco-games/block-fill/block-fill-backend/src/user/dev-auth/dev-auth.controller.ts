import { Body, Controller, Post } from '@nestjs/common';

import { CreateDevSessionDto } from './dto/create-dev-session.dto';
import { DevAuthService } from './dev-auth.service';

@Controller({ path: 'user/auth', version: '1' })
export class DevAuthController {
    constructor(private readonly devAuthService: DevAuthService) {}

    /**
     * Creates a dev session for local development.
     * POST /api/v1/user/auth/dev-session
     * Body: { stageId: string }
     * Returns a signed JWT token matching the production auth contract.
     */
    @Post('dev-session')
    createDevSession(@Body() dto: CreateDevSessionDto) {
        return this.devAuthService.createDevSession(dto.stageId);
    }
}
