import { RequireSession, TOKEN_TYPES, USER_TYPES } from '@common/decorators/session.decorator';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

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
}
