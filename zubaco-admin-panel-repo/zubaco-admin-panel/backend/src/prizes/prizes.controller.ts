import { Controller, Post, Get, Param, Body } from '@nestjs/common';

import { PrizesService } from './prizes.service';

@Controller('admin/prizes')
export class PrizesController {
  constructor(private readonly prizesService: PrizesService) {}

  @Post('distribute')
  async distribute(
    @Body() body: { season_id: string; distributions: { user_id: string; amount: number; rank: number }[] },
  ) {
    return this.prizesService.distribute(body.season_id, body.distributions);
  }

  @Get('season/:id')
  async getSeasonDistributions(@Param('id') id: string) {
    return this.prizesService.getSeasonDistributions(id);
  }
}
