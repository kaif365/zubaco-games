import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SocialService } from './social.service';
import { ChallengeService } from './challenge.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GameType } from '.prisma/client';

@Controller('social')
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(
    private readonly socialService: SocialService,
    private readonly challengeService: ChallengeService,
  ) {}

  @Get('friends')
  async getFriends(@CurrentUser() userId: string) {
    return this.socialService.getFriends(userId);
  }

  @Get('friends/pending')
  async getPendingRequests(@CurrentUser() userId: string) {
    return this.socialService.getPendingRequests(userId);
  }

  @Post('friends/request')
  async sendRequest(@CurrentUser() userId: string, @Body() body: { username: string }) {
    return this.socialService.sendFriendRequest(userId, body.username);
  }

  @Post('friends/:friendshipId/accept')
  async acceptRequest(@CurrentUser() userId: string, @Param('friendshipId') friendshipId: string) {
    return this.socialService.acceptFriendRequest(userId, friendshipId);
  }

  @Delete('friends/:friendId')
  async removeFriend(@CurrentUser() userId: string, @Param('friendId') friendId: string) {
    return this.socialService.removeFriend(userId, friendId);
  }

  @Get('referral/code')
  async getReferralCode(@CurrentUser() userId: string) {
    const code = await this.socialService.generateReferralCode(userId);
    return { code };
  }

  @Post('referral/apply')
  async applyReferral(@CurrentUser() userId: string, @Body() body: { code: string }) {
    return this.socialService.applyReferralCode(userId, body.code);
  }

  // ─── CHALLENGE ENDPOINTS ───────────────────────────────────────

  @Post('challenges')
  async createChallenge(
    @CurrentUser() userId: string,
    @Body() body: { opponent_id: string; game_type: GameType; level?: number },
  ) {
    return this.challengeService.createChallenge(userId, body.opponent_id, body.game_type, body.level);
  }

  @Get('challenges')
  async getMyChallenges(@CurrentUser() userId: string, @Query('status') status?: string) {
    return this.challengeService.getMyChallenges(userId, status);
  }

  @Get('challenges/:id')
  async getChallengeResult(@Param('id') id: string) {
    return this.challengeService.getChallengeResult(id);
  }

  @Post('challenges/:id/accept')
  async acceptChallenge(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.challengeService.acceptChallenge(userId, id);
  }

  @Post('challenges/:id/decline')
  async declineChallenge(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.challengeService.declineChallenge(userId, id);
  }

  @Post('challenges/:id/submit')
  async submitChallengeScore(
    @CurrentUser() userId: string,
    @Param('id') id: string,
    @Body() body: { session_id: string; score: number },
  ) {
    return this.challengeService.submitChallengeScore(userId, id, body.session_id, body.score);
  }

  // ─── SCORE SHARING ─────────────────────────────────────────────

  @Post('share')
  async generateShareLink(
    @CurrentUser() userId: string,
    @Body() body: { session_id: string; game_type: GameType; score: number },
  ) {
    return this.socialService.generateShareLink(userId, body.session_id, body.game_type, body.score);
  }
}
