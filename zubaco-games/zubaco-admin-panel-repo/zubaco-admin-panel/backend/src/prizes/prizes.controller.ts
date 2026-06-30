import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RequireSession, TOKEN_TYPES, USER_TYPES } from '@common/decorators/session.decorator';

import { PrizesService } from './prizes.service';
import { DistributePrizesDto } from './dto/distribute-prizes.dto';

@ApiTags('Admin Prizes')
@ApiBearerAuth('authorization')
@RequireSession({
  tokenTypes: [TOKEN_TYPES.LOGIN],
  userTypes: [USER_TYPES.ADMIN],
})
@Controller('admin/prizes')
export class PrizesController {
  constructor(private readonly prizesService: PrizesService) {}

  @Post('distribute')
  async distribute(@Body() body: DistributePrizesDto) {
    return this.prizesService.distribute(body.season_id, body.distributions);
  }

  @Get('season/:id')
  async getSeasonDistributions(@Param('id') id: string) {
    return this.prizesService.getSeasonDistributions(id);
  }
}
