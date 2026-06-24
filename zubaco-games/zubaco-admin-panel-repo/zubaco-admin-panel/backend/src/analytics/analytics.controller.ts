import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RequireSession, TOKEN_TYPES, USER_TYPES } from '@common/decorators/session.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('Admin Analytics')
@ApiBearerAuth('authorization')
@RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
})
@Controller('admin/analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) {}

    @Get('overview')
    async getOverview() {
        return this.analyticsService.getOverview();
    }

    @Get('users/growth')
    async getUserGrowth(@Query('days') days?: string) {
        return this.analyticsService.getUserGrowth(parseInt(days || '30'));
    }

    @Get('users/retention')
    async getRetention() {
        return this.analyticsService.getRetention();
    }

    @Get('revenue')
    async getRevenue(@Query('days') days?: string) {
        return this.analyticsService.getRevenue(parseInt(days || '30'));
    }

    @Get('games/popularity')
    async getGamePopularity() {
        return this.analyticsService.getGamePopularity();
    }

    @Get('games/completion')
    async getGameCompletion() {
        return this.analyticsService.getGameCompletionRates();
    }

    @Get('seasons/stats')
    async getSeasonStats(@Query('season_id') seasonId?: string) {
        return this.analyticsService.getSeasonStats(seasonId);
    }
}
