import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RequireSession, TOKEN_TYPES, USER_TYPES } from '@common/decorators/session.decorator';
import { SeasonsService } from './seasons.service';

@ApiTags('Admin Seasons')
@ApiBearerAuth('authorization')
@RequireSession({
    tokenTypes: [TOKEN_TYPES.LOGIN],
    userTypes: [USER_TYPES.ADMIN],
})
@Controller('admin/seasons')
export class SeasonsController {
    constructor(private readonly seasonsService: SeasonsService) {}

    @Post()
    async createSeason(@Body() body: {
        name: string;
        description?: string;
        start_date: string;
        end_date: string;
        prize_pool?: number;
        entry_fee?: number;
        max_players?: number;
    }) {
        return this.seasonsService.createSeason(body);
    }

    @Get()
    async listSeasons(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('status') status?: string,
    ) {
        return this.seasonsService.listSeasons(parseInt(page || '1'), parseInt(limit || '20'), status);
    }

    @Get(':seasonId')
    async getSeason(@Param('seasonId') seasonId: string) {
        return this.seasonsService.getSeasonDetail(seasonId);
    }

    @Patch(':seasonId')
    async updateSeason(@Param('seasonId') seasonId: string, @Body() body: any) {
        return this.seasonsService.updateSeason(seasonId, body);
    }

    @Delete(':seasonId')
    async deleteSeason(@Param('seasonId') seasonId: string) {
        return this.seasonsService.deleteSeason(seasonId);
    }

    // ─── STAGE MANAGEMENT ────────────────────────────────────────

    @Post(':seasonId/stages')
    async addStage(@Param('seasonId') seasonId: string, @Body() body: {
        stage_number: number;
        name?: string;
        open_date: string;
        close_date: string;
        elimination_pct?: number;
    }) {
        return this.seasonsService.addStage(seasonId, body);
    }

    @Patch(':seasonId/stages/:stageId')
    async updateStage(
        @Param('seasonId') seasonId: string,
        @Param('stageId') stageId: string,
        @Body() body: any,
    ) {
        return this.seasonsService.updateStage(stageId, body);
    }

    @Post(':seasonId/stages/:stageId/open')
    async openStage(@Param('stageId') stageId: string) {
        return this.seasonsService.openStage(stageId);
    }

    @Post(':seasonId/stages/:stageId/close')
    async closeStage(@Param('stageId') stageId: string) {
        return this.seasonsService.closeStage(stageId);
    }

    @Post(':seasonId/stages/:stageId/eliminate')
    async triggerElimination(@Param('stageId') stageId: string) {
        return this.seasonsService.triggerElimination(stageId);
    }

    // ─── GAME ASSIGNMENT ─────────────────────────────────────────

    @Post(':seasonId/stages/:stageId/games')
    async assignGames(
        @Param('stageId') stageId: string,
        @Body() body: { games: { game_type: string; game_order: number; level_config_id?: string }[] },
    ) {
        return this.seasonsService.assignGamesToStage(stageId, body.games);
    }

    // ─── SEASON PLAYERS ──────────────────────────────────────────

    @Get(':seasonId/players')
    async getSeasonPlayers(
        @Param('seasonId') seasonId: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('status') status?: string,
    ) {
        return this.seasonsService.getSeasonPlayers(seasonId, parseInt(page || '1'), parseInt(limit || '50'), status);
    }

    @Post(':seasonId/players/:userId/disqualify')
    async disqualifyPlayer(@Param('seasonId') seasonId: string, @Param('userId') userId: string, @Body() body: { reason: string }) {
        return this.seasonsService.disqualifyPlayer(seasonId, userId, body.reason);
    }
}
