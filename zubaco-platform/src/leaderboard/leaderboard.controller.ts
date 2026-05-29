import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GameType } from '.prisma/client';

@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('game/:gameType')
  async getGameLeaderboard(
    @Param('gameType') gameType: GameType,
    @Query('period') period?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.leaderboardService.getGameLeaderboard(gameType, period || 'all-time', page || 1, limit || 50);
  }

  @Get('game/:gameType/me')
  async getMyRank(@CurrentUser() userId: string, @Param('gameType') gameType: GameType) {
    return this.leaderboardService.getMyRank(userId, gameType);
  }

  @Get('game/:gameType/endless')
  async getEndlessLeaderboard(
    @Param('gameType') gameType: GameType,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.leaderboardService.getEndlessLeaderboard(gameType, page || 1, limit || 50);
  }

  @Get('game/:gameType/friends')
  async getFriendsLeaderboard(@CurrentUser() userId: string, @Param('gameType') gameType: GameType) {
    return this.leaderboardService.getFriendsLeaderboard(userId, gameType);
  }

  @Get('stage/:stageId')
  async getStageLeaderboard(
    @Param('stageId') stageId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.leaderboardService.getStageLeaderboard(stageId, page || 1, limit || 50);
  }
}
