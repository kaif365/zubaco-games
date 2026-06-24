import { Controller, Get, Post, Body, Param, Headers, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { GameSessionService } from './game-session.service';
import { ScoreValidatorService } from './score-validator.service';
import { AntiCheatService } from '../anti-cheat/anti-cheat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StartGameDto, SubmitGameResultDto, StartTournamentGameDto } from './dto/game-session.dto';
import { GameType } from '.prisma/client';

@Controller('game-session')
@UseGuards(JwtAuthGuard)
export class GameSessionController {
  constructor(
    private readonly gameSessionService: GameSessionService,
    private readonly scoreValidator: ScoreValidatorService,
  ) {}

  @Post('start')
  async startGame(
    @CurrentUser() userId: string,
    @Body() dto: StartGameDto,
    @Req() req: any,
  ) {
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    const deviceFingerprint = req.headers['x-device-fingerprint'] || undefined;
    const deviceComponents = dto.device_components || undefined;

    return this.gameSessionService.startGame(userId, dto.game_type, dto.config, {
      ipAddress,
      deviceFingerprint,
      deviceComponents,
    });
  }

  @Post('tournament/start')
  async startTournamentGame(@CurrentUser() userId: string, @Body() dto: StartTournamentGameDto) {
    return this.gameSessionService.startTournamentGame(userId, dto.stage_game_id, dto.stage_entry_id);
  }

  @Get(':sessionId/state')
  async getState(@CurrentUser() userId: string, @Param('sessionId') sessionId: string) {
    return this.gameSessionService.getSessionState(sessionId, userId);
  }

  @Post(':sessionId/submit')
  async submitResult(
    @CurrentUser() userId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitGameResultDto,
  ) {
    return this.gameSessionService.submitResult(sessionId, userId, dto.score, dto.duration_ms, dto.metadata, {
      movesHash: dto.moves_hash,
      inputSignature: dto.input_signature,
    });
  }

  // ─── SCORING ENGINE ENDPOINTS ───────────────────────────────────

  @Get('scoring/config/:gameType')
  getScoringConfig(@Param('gameType') gameType: string) {
    return this.scoreValidator.getScoringConfig(gameType as GameType);
  }

  @Post('scoring/breakdown')
  calculateBreakdown(
    @Body() dto: { game_type: string; correct_actions: number; wrong_actions: number; time_limit_ms: number; remaining_time_ms: number },
  ) {
    return this.scoreValidator.calculateScoreBreakdown(
      dto.game_type as GameType,
      dto.correct_actions,
      dto.wrong_actions,
      dto.time_limit_ms,
      dto.remaining_time_ms,
    );
  }
}

/**
 * Internal API for game backends to report game completion, heartbeats, and real-time flags.
 * Protected by API key (not user JWT) — game backends call this after gameplay ends.
 */
@Controller('internal/game')
export class InternalGameController {
  private readonly INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

  constructor(
    private readonly gameSessionService: GameSessionService,
    private readonly antiCheat: AntiCheatService,
  ) {}

  private validateApiKey(apiKey: string) {
    if (!this.INTERNAL_API_KEY || apiKey !== this.INTERNAL_API_KEY) {
      throw new UnauthorizedException('Invalid API key');
    }
  }

  @Post('complete')
  async gameComplete(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: {
      sessionId: string;
      userId: string;
      score: number;
      durationMs: number;
      gameType: string;
      metadata?: any;
      movesHash?: string;
      inputSignature?: any;
    },
  ) {
    this.validateApiKey(apiKey);

    return this.gameSessionService.submitResult(
      dto.sessionId,
      dto.userId,
      dto.score,
      dto.durationMs,
      dto.metadata,
      {
        movesHash: dto.movesHash,
        inputSignature: dto.inputSignature,
      },
    );
  }

  @Post('start')
  async gameStart(
    @Headers('x-api-key') apiKey: string,
    @Req() req: any,
    @Body() dto: { userId: string; gameType: string; config?: any; mode?: string; deviceFingerprint?: string; deviceComponents?: any },
  ) {
    this.validateApiKey(apiKey);

    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;

    return this.gameSessionService.startGame(dto.userId, dto.gameType, dto.config, {
      ipAddress,
      deviceFingerprint: dto.deviceFingerprint,
      deviceComponents: dto.deviceComponents,
    });
  }

  /**
   * Session heartbeat — game backends call every 10s during active gameplay.
   */
  @Post('heartbeat')
  async heartbeat(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: { sessionId: string; sequence: number; clientTs: string },
  ) {
    this.validateApiKey(apiKey);

    await this.antiCheat.recordHeartbeat(dto.sessionId, dto.sequence, new Date(dto.clientTs));
    return { ok: true };
  }

  /**
   * Real-time flag — game backends call when they detect physically impossible inputs.
   * Returns { action: "TERMINATE" } to instruct game backend to disconnect player.
   */
  @Post('flag-realtime')
  async flagRealtime(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: { sessionId: string; userId: string; gameType: string; reason: string },
  ) {
    this.validateApiKey(apiKey);

    return this.antiCheat.flagRealtime(dto.sessionId, dto.userId, dto.gameType as GameType, dto.reason);
  }
}
