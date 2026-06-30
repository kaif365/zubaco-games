import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { EliminationService } from './elimination.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GeoFencingGuard } from '../compliance/geo-fencing.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SubmitTournamentResultDto } from '../game-session/dto/game-session.dto';

@Controller('tournament')
@UseGuards(JwtAuthGuard)
export class TournamentController {
  constructor(
    private readonly tournamentService: TournamentService,
    private readonly eliminationService: EliminationService,
    private readonly leaderboardService: LeaderboardService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('seasons')
  async getActiveSeasons() {
    return this.tournamentService.getActiveSeasons();
  }

  @Post('seasons/:seasonId/register')
  @UseGuards(GeoFencingGuard) // Block users in banned states from paid tournaments
  async register(@CurrentUser() userId: string, @Param('seasonId') seasonId: string) {
    return this.tournamentService.registerForSeason(userId, seasonId);
  }

  @Get('seasons/:seasonId/status')
  async getMyStatus(@CurrentUser() userId: string, @Param('seasonId') seasonId: string) {
    return this.tournamentService.getMySeasonStatus(userId, seasonId);
  }

  @Post('seasons/:seasonId/stages/:stageNumber/games/:gameOrder/start')
  async startGame(
    @CurrentUser() userId: string,
    @Param('seasonId') seasonId: string,
    @Param('stageNumber') stageNumber: number,
    @Param('gameOrder') gameOrder: number,
    @Req() req: any,
    @Body() body?: { device_components?: any },
  ) {
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    const deviceFingerprint = req.headers['x-device-fingerprint'] || undefined;
    return this.tournamentService.startTournamentGame(userId, seasonId, stageNumber, gameOrder, {
      ipAddress,
      deviceFingerprint,
      deviceComponents: body?.device_components,
    });
  }

  @Post('submit')
  async submitResult(
    @CurrentUser() userId: string,
    @Body() dto: SubmitTournamentResultDto,
  ) {
    return this.tournamentService.submitTournamentResult(userId, dto.session_id, dto.score, dto.duration_ms);
  }

  @Get('seasons/:seasonId/stages/:stageNumber/rankings')
  async getStageRankings(
    @Param('seasonId') seasonId: string,
    @Param('stageNumber') stageNumber: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    // Find the stage ID from season + stage number
    const stage = await this.prisma.seasonStage.findUnique({
      where: { season_id_stage_number: { season_id: seasonId, stage_number: Number(stageNumber) } },
    });
    if (!stage) return { rankings: [], total: 0, page: 1, totalPages: 0 };

    return this.eliminationService.getStageRankings(stage.id, page || 1, limit || 50);
  }

  @Get('seasons/:seasonId/stages/:stageNumber/live')
  async getLiveLeaderboard(
    @Param('seasonId') seasonId: string,
    @Param('stageNumber') stageNumber: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const stage = await this.prisma.seasonStage.findUnique({
      where: { season_id_stage_number: { season_id: seasonId, stage_number: Number(stageNumber) } },
    });
    if (!stage) return { rankings: [], total: 0, page: 1, totalPages: 0 };

    return this.leaderboardService.getLiveStageLeaderboard(stage.id, page || 1, limit || 50);
  }

  @Get('seasons/:seasonId/stages/:stageNumber/my-rank')
  async getMyStageRank(
    @CurrentUser() userId: string,
    @Param('seasonId') seasonId: string,
    @Param('stageNumber') stageNumber: number,
  ) {
    const stage = await this.prisma.seasonStage.findUnique({
      where: { season_id_stage_number: { season_id: seasonId, stage_number: Number(stageNumber) } },
    });
    if (!stage) return { rank: null, score: null };

    return this.leaderboardService.getMyStageRank(stage.id, userId);
  }
}
