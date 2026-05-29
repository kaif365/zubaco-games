import { Controller, Get, Post, Patch, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AchievementService } from './achievement.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly achievementService: AchievementService,
  ) {}

  @Get('me')
  async getProfile(@CurrentUser() userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  async updateProfile(@CurrentUser() userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('me/history')
  async getHistory(
    @CurrentUser() userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.getGameHistory(userId, page || 1, limit || 20);
  }

  @Get('me/stats')
  async getStats(@CurrentUser() userId: string) {
    return this.usersService.getStats(userId);
  }

  @Get('me/tournaments')
  async getTournamentHistory(
    @CurrentUser() userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.getTournamentHistory(userId, page || 1, limit || 10);
  }

  @Get('me/achievements')
  async getAchievements(@CurrentUser() userId: string) {
    return this.achievementService.getUserAchievements(userId);
  }

  @Post('me/achievements/check')
  async checkAchievements(@CurrentUser() userId: string) {
    const unlocked = await this.achievementService.evaluateAndUnlock(userId);
    return { newly_unlocked: unlocked };
  }

  @Delete('me')
  async deleteAccount(@CurrentUser() userId: string) {
    return this.usersService.requestAccountDeletion(userId);
  }
}
