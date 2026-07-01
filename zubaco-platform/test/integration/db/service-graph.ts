/**
 * Real service-graph factory for the Phase T4-A DATABASE-BACKED integration
 * suite.
 *
 * This wires the ACTUAL production service classes together against a REAL
 * PostgreSQL (`zubaco_test`) and a REAL Redis. Nothing about the persistence or
 * business logic is mocked. The ONLY seam replaced is the outbound SMS provider
 * (`SmsService.send`) — a true external I/O boundary (MSG91/Twilio HTTP) that
 * must not be hit from a test. Every other collaborator (Prisma, Redis, ledger,
 * enforcement, tournament orchestration, event bus, webhook outbox, …) is the
 * genuine object, so the tests exercise real transactions, real row locks, real
 * idempotency and real cross-service side effects.
 *
 * Firebase (push), Razorpay (deposits) and the Base-Platform webhook HTTP
 * delivery are never reached by the flows under test: the FCM key is unset (push
 * short-circuits), the Razorpay gateway service is not constructed, and the
 * webhook/event outboxes only ENQUEUE into Redis here — their cron drainers are
 * not scheduled when the classes are instantiated directly.
 */
import { JwtService } from '@nestjs/jwt';

import { PrismaService } from '../../../src/common/prisma/prisma.service';
import { RedisService } from '../../../src/common/redis/redis.service';

import { DeterministicRngService } from '../../../src/rng/deterministic-rng.service';
import { PuzzleService } from '../../../src/rng/puzzle.service';
import { ScoringService } from '../../../src/scoring/scoring.service';

import { DefaultGameVerifier } from '../../../src/game-session/verification/default.verifier';
import { VerificationPipeline } from '../../../src/game-session/verification/verification.pipeline';

import { TdsService } from '../../../src/compliance/tds.service';
import { GstService } from '../../../src/compliance/gst.service';
import { AgeVerificationService } from '../../../src/compliance/age-verification.service';

import { BankDetailService } from '../../../src/wallet/bank-detail.service';
import { WalletLedgerService } from '../../../src/wallet/ledger/ledger.service';
import { WalletService } from '../../../src/wallet/wallet.service';

import { LeaderboardService } from '../../../src/leaderboard/leaderboard.service';
import { NotificationService } from '../../../src/notification/notification.service';
import { WebhookService } from '../../../src/webhook/webhook.service';
import { EventBusService } from '../../../src/events/event-bus.service';

import { TokenService } from '../../../src/auth/token.service';
import { OtpService } from '../../../src/auth/otp.service';
import { SmsService } from '../../../src/auth/sms.service';

import { EnforcementService } from '../../../src/anti-cheat/enforcement/enforcement.service';
import { AntiCheatService } from '../../../src/anti-cheat/anti-cheat.service';

import { SessionCompletionService } from '../../../src/game-session/completion/session-completion.service';
import { GameSessionService } from '../../../src/game-session/game-session.service';

import { EliminationService } from '../../../src/tournament/elimination.service';
import { RewardPayoutService } from '../../../src/tournament/orchestration/reward-payout.service';
import { TournamentOrchestrator } from '../../../src/tournament/orchestration/tournament.orchestrator';
import { TournamentService } from '../../../src/tournament/tournament.service';

import { AdminControlPlaneService } from '../../../src/admin/control-plane/admin-control-plane.service';

export interface ServiceGraph {
  prisma: PrismaService;
  redis: RedisService;
  jwt: JwtService;
  // Auth
  token: TokenService;
  otp: OtpService;
  sms: SmsService;
  smsSent: Array<{ phone: string; message: string }>;
  // Wallet / compliance
  ledger: WalletLedgerService;
  wallet: WalletService;
  tds: TdsService;
  gst: GstService;
  bankDetail: BankDetailService;
  ageVerification: AgeVerificationService;
  // Game / verification / anti-cheat
  scoring: ScoringService;
  verification: VerificationPipeline;
  antiCheat: AntiCheatService;
  enforcement: EnforcementService;
  gameSession: GameSessionService;
  completion: SessionCompletionService;
  puzzle: PuzzleService;
  // Leaderboard / notifications / events
  leaderboard: LeaderboardService;
  notification: NotificationService;
  events: EventBusService;
  webhook: WebhookService;
  // Tournament
  elimination: EliminationService;
  rewardPayout: RewardPayoutService;
  orchestrator: TournamentOrchestrator;
  tournament: TournamentService;
  // Admin
  admin: AdminControlPlaneService;
  /** Release shared Prisma + Redis connections (call from afterAll). */
  teardown: () => Promise<void>;
}

/**
 * Build the full real graph over shared Prisma + Redis singletons. The caller
 * connects Prisma (via prisma-test-util.getPrisma) and passes both singletons
 * in so every spec reuses ONE database connection and ONE Redis client.
 */
export function buildServiceGraph(prisma: PrismaService, redis: RedisService): ServiceGraph {
  const jwt = new JwtService({});

  // ── RNG / scoring / verification ──
  const rng = new DeterministicRngService();
  const puzzle = new PuzzleService(rng);
  const scoring = new ScoringService();
  const defaultVerifier = new DefaultGameVerifier(scoring);
  const verification = new VerificationPipeline(defaultVerifier, []);

  // ── compliance ──
  const tds = new TdsService(prisma);
  const gst = new GstService();
  const ageVerification = new AgeVerificationService(prisma);
  const bankDetail = new BankDetailService(prisma);

  // ── SMS: the one external boundary we stub (record instead of HTTP call) ──
  const sms = new SmsService();
  const smsSent: Array<{ phone: string; message: string }> = [];
  (sms as unknown as { send: (phone: string, message: string) => Promise<boolean> }).send = async (
    phone: string,
    message: string,
  ) => {
    smsSent.push({ phone, message });
    return true;
  };

  // ── wallet / ledger ──
  const ledger = new WalletLedgerService(prisma, redis);

  // ── events + webhook outbox (Redis-backed; cron drainers not scheduled here) ──
  const webhook = new WebhookService(redis);
  const events = new EventBusService(redis, []);

  // ── leaderboard / notifications ──
  const leaderboard = new LeaderboardService(prisma, redis);
  const notification = new NotificationService(prisma);

  // ── auth ──
  const token = new TokenService(jwt, prisma);
  const otp = new OtpService(prisma, redis, sms);

  const wallet = new WalletService(prisma, redis, otp, bankDetail, tds, ledger);

  // ── anti-cheat + enforcement ──
  const enforcement = new EnforcementService(prisma, redis, leaderboard, webhook, events);
  const antiCheat = new AntiCheatService(prisma, enforcement);

  // ── authoritative completion path + game session ──
  const completion = new SessionCompletionService(
    prisma,
    verification,
    antiCheat,
    webhook,
    events,
    redis,
    leaderboard,
  );
  const gameSession = new GameSessionService(prisma, puzzle, completion);

  // ── tournament ──
  const elimination = new EliminationService(prisma);
  const rewardPayout = new RewardPayoutService(prisma, redis, wallet, events);
  const orchestrator = new TournamentOrchestrator(prisma, redis, elimination, events, rewardPayout);
  const tournament = new TournamentService(prisma, wallet, ageVerification, puzzle, completion);

  // ── admin control plane ──
  const admin = new AdminControlPlaneService(redis, orchestrator, rewardPayout, ledger, enforcement, events);

  return {
    prisma,
    redis,
    jwt,
    token,
    otp,
    sms,
    smsSent,
    ledger,
    wallet,
    tds,
    gst,
    bankDetail,
    ageVerification,
    scoring,
    verification,
    antiCheat,
    enforcement,
    gameSession,
    completion,
    puzzle,
    leaderboard,
    notification,
    events,
    webhook,
    elimination,
    rewardPayout,
    orchestrator,
    tournament,
    admin,
    teardown: async () => {
      await prisma.$disconnect();
      redis.onModuleDestroy();
    },
  };
}
