import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TournamentService } from './tournament.service';
import { EliminationService } from './elimination.service';
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
  ) {
    return this.tournamentService.startTournamentGame(userId, seasonId, stageNumber, gameOrder);
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
    const { PrismaService } = require('../common/prisma/prisma.service');
    // Note: in production, inject PrismaService properly
    return this.eliminationService.getStageRankings(seasonId, page || 1, limit || 50);
  }
}
