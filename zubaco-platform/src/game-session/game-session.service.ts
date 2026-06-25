import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';
import { PuzzleService } from '../rng/puzzle.service';
import { WebhookService } from '../webhook/webhook.service';
import { AntiCheatService } from '../anti-cheat/anti-cheat.service';
import * as crypto from 'crypto';

@Injectable()
export class GameSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
    private readonly puzzle: PuzzleService,
    private readonly webhook: WebhookService,
    private readonly antiCheat: AntiCheatService,
  ) {}

  /**
   * Primary game session flow used by the mobile app WebView integration.
   * Matches the contract: POST /UserContest/{key}/startGame
   */
  async startGame(userId: string, gameType: string, config: any) {
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');

    // Deterministically generate a server-authored board for validatable puzzles.
    const generated = this.puzzle.generate(gameType, serverSeed, config || {});
    const clientConfig = generated ? { ...(config || {}), server_board: generated.board } : config || {};

    const session = await this.prisma.gameSession.create({
      data: {
        user_id: userId,
        game_type: gameType as any,
        mode: 'FREE_PLAY',
        server_seed: serverSeed,
        config: clientConfig,
        // Solution/fingerprint kept server-side only; never returned at start.
        metadata: generated
          ? { _puzzle: { solution: generated.solution, fingerprint: generated.fingerprint, meta: generated.meta } }
          : undefined,
      },
    });

    return {
      gameSessionId: session.id,
      serverSeedHash, // Give hash before game, reveal actual seed after
      config: clientConfig,
      startedAt: session.started_at,
    };
  }

  /**
   * Start a tournament game session.
   * Config is ALWAYS loaded from the server-side StageGame level_config.
   * This ensures all players in the same tournament stage get identical game parameters.
   * Client-supplied config is IGNORED for fairness.
   */
  async startTournamentGame(userId: string, stageGameId: string, stageEntryId: string) {
    // Load the stage game to get the server-defined config
    const stageGame = await this.prisma.stageGame.findUnique({
      where: { id: stageGameId },
      include: { level_config: true, season_stage: true },
    });

    if (!stageGame) throw new NotFoundException('Stage game not found');

    // Verify stage is open
    if (stageGame.season_stage.status !== 'OPEN') {
      throw new ForbiddenException('This stage is not currently open');
    }

    // Verify user has a valid stage entry
    const stageEntry = await this.prisma.stageEntry.findFirst({
      where: { id: stageEntryId, season_stage_id: stageGame.season_stage_id, eliminated: false },
      include: { season_entry: true },
    });

    if (!stageEntry || stageEntry.season_entry.user_id !== userId) {
      throw new ForbiddenException('You are not eligible for this stage');
    }

    // Check if already played this game in this stage
    const existingSession = await this.prisma.gameSession.findFirst({
      where: {
        user_id: userId,
        stage_entry_id: stageEntryId,
        game_type: stageGame.game_type,
        outcome: { not: null },
      },
    });

    if (existingSession) {
      throw new ForbiddenException('You have already played this game in this stage');
    }

    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');

    // Use ONLY the server-side level config - never trust client config
    const gameConfig = stageGame.level_config?.config || {};

    // Deterministically generate a server-authored board for validatable puzzles.
    const generated = this.puzzle.generate(stageGame.game_type, serverSeed, gameConfig);
    const clientConfig = generated
      ? { ...(gameConfig as Record<string, unknown>), server_board: generated.board }
      : gameConfig;

    const session = await this.prisma.gameSession.create({
      data: {
        user_id: userId,
        game_type: stageGame.game_type,
        mode: 'TOURNAMENT',
        level: stageGame.level_config ? undefined : stageGame.game_order,
        stage_entry_id: stageEntryId,
        server_seed: serverSeed,
        config: clientConfig, // Server-side config only
        metadata: generated
          ? { _puzzle: { solution: generated.solution, fingerprint: generated.fingerprint, meta: generated.meta } }
          : undefined,
      },
    });

    return {
      gameSessionId: session.id,
      serverSeedHash,
      gameType: stageGame.game_type,
      config: clientConfig, // Send config to client so game can render
      startedAt: session.started_at,
    };
  }

  /**
   * Get session state - used by game frontend to verify session
   */
  async getSessionState(sessionId: string, userId: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        user_id: true,
        game_type: true,
        mode: true,
        level: true,
        server_seed: true,
        config: true,
        started_at: true,
        outcome: true,
      },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.user_id !== userId) throw new ForbiddenException('Not your session');

    // Only reveal server_seed after game is completed (provable fairness)
    const { user_id, server_seed, ...rest } = session;
    return {
      ...rest,
      server_seed: session.outcome ? server_seed : undefined,
      server_seed_hash: crypto.createHash('sha256').update(server_seed).digest('hex'),
    };
  }

  /**
   * Submit game result - called by game frontend after play.
   *
   * The `score` argument is the CLIENT-CLAIMED score and is NEVER trusted. The
   * authoritative score is re-derived server-side from the submitted `metadata`
   * (verifiable game facts) using the ScoringService. A large discrepancy
   * between the claimed and server score is recorded for anti-cheat review.
   */
  async submitResult(sessionId: string, userId: string, score: number, durationMs: number, metadata?: any) {
    // Hard reject obviously invalid values
    if (typeof score === 'number' && score < 0) throw new ForbiddenException('Invalid score');
    if (durationMs < 1000) throw new ForbiddenException('Invalid duration');
    if (durationMs > 1800000) throw new ForbiddenException('Session timeout exceeded'); // 30 min max

    const session = await this.prisma.gameSession.findFirst({
      where: { id: sessionId, user_id: userId, outcome: null },
    });

    if (!session) throw new NotFoundException('Active session not found');

    // Verify elapsed time is plausible (session must have started before now)
    const elapsed = Date.now() - new Date(session.started_at).getTime();
    if (durationMs > elapsed + 5000) {
      throw new ForbiddenException('Duration exceeds session age');
    }

    // ── Deterministic puzzle validation ───────────────────────────
    // For server-generated puzzles, fold the authoritative server values
    // (shortest path, fingerprint check) into the scoring metadata so the
    // client cannot inflate efficiency-based scores.
    const storedPuzzle = (session.metadata as any)?._puzzle;
    let boardTampered = false;
    const scoringMeta = { ...(metadata || {}) };
    if (storedPuzzle) {
      // Inject the server-computed shortest path for maze efficiency scoring.
      if (storedPuzzle.meta?.shortest_path && Array.isArray(scoringMeta.rounds)) {
        scoringMeta.rounds = scoringMeta.rounds.map((r: any) => ({
          ...r,
          shortestPath: r.shortestPath ?? storedPuzzle.meta.shortest_path,
        }));
      }
      // If the client reported a board fingerprint, it must match the server's.
      if (metadata?.board_fingerprint) {
        boardTampered = metadata.board_fingerprint !== storedPuzzle.fingerprint;
      }
    }

    // ── Server-authoritative scoring ──────────────────────────────
    const claimedScore = typeof score === 'number' ? score : null;
    const result = this.scoring.score(session.game_type, scoringMeta, session.config);
    const authoritativeScore =
      boardTampered
        ? 0
        : result.validated
        ? result.score
        : Math.max(0, Math.min(claimedScore ?? 0, result.maxScore));

    // Flag a meaningful gap between what the client claimed and what we computed.
    const discrepancy =
      claimedScore !== null && result.validated ? Math.abs(claimedScore - result.score) : 0;
    const flagged = boardTampered || !result.validated || discrepancy > Math.max(10, result.maxScore * 0.1);

    const updated = await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        score: authoritativeScore,
        max_score: result.maxScore,
        duration_ms: durationMs,
        outcome: boardTampered ? 'DISQUALIFIED' : 'COMPLETED',
        completed_at: new Date(),
        metadata: {
          ...(metadata || {}),
          ...(storedPuzzle ? { _puzzle: storedPuzzle } : {}),
          _scoring: {
            claimed_score: claimedScore,
            server_score: result.score,
            max_score: result.maxScore,
            validated: result.validated,
            breakdown: result.breakdown,
            discrepancy,
            board_tampered: boardTampered,
            flagged,
          },
        },
      },
    });

    // Run anti-cheat analysis on the authoritative result (best-effort).
    try {
      await this.antiCheat.analyzeGameResult(
        userId,
        updated.id,
        authoritativeScore,
        durationMs,
        updated.game_type,
        { metadata, claimedScore, serverScore: result.score, boardTampered },
      );
    } catch {
      // Never block result submission on anti-cheat analysis failures.
    }

    // Notify the Base Platform of the validated result (durable, signed, async).
    await this.webhook.emitGameResult({
      session_id: updated.id,
      user_id: updated.user_id,
      game_type: updated.game_type as any,
      mode: updated.mode as any,
      score: updated.score ?? 0,
      max_score: updated.max_score ?? 0,
      duration_ms: updated.duration_ms,
      outcome: updated.outcome ?? 'COMPLETED',
      stage_entry_id: updated.stage_entry_id,
      level: updated.level,
      flagged,
      validated: result.validated,
      completed_at: (updated.completed_at ?? new Date()).toISOString(),
    });

    return { success: true, score: updated.score, max_score: updated.max_score, validated: result.validated };
  }
}
