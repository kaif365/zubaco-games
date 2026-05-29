import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';

import { ExportsService } from './exports.service';

@Controller('admin/exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('users/csv')
  async exportUsersCsv(@Res() res: Response) {
    const csv = await this.exportsService.exportUsersCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
    res.send(csv);
  }

  @Get('season/:id/results/csv')
  async exportSeasonResultsCsv(@Param('id') id: string, @Res() res: Response) {
    const csv = await this.exportsService.exportSeasonResultsCsv(id);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="season_${id}_results.csv"`);
    res.send(csv);
  }

  @Get('transactions/csv')
  async exportTransactionsCsv(
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const csv = await this.exportsService.exportTransactionsCsv(from, to);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(csv);
  }
}
