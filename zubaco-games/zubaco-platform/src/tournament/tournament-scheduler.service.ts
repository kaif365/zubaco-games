import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { EliminationService } from './elimination.service';
import { WalletService } from '../wallet/wallet.service';
import { TournamentEventsService } from './tournament-events.service';

@Injectable()
export class TournamentSchedulerService {
  private readonly logger = new Logger(TournamentSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eliminationService: EliminationService,
    private readonly walletService: WalletService,
    private readonly events: TournamentEventsService,
  ) {}

  /**
   * Every 5 minutes: open stages whose open_date has passed
   * LOCKED → OPEN
   */
  @Cron('*/5 * * * *')
  async openDueStages() {
    if (!(await this.redis.acquireLock('lock:cron:openDueStages', 290))) return;
    const now = new Date();

    const stagesToOpen = await this.prisma.seasonStage.findMany({
      where: {
        status: 'LOCKED',
        open_date: { lte: now },
        season: { status: 'ACTIVE' },
      },
      include: { season: { select: { id: true, name: true } } },
    });

    for (const stage of stagesToOpen) {
      try {
        await this.prisma.seasonStage.update({
          where: { id: stage.id },
          data: { status: 'OPEN' },
        });
        this.events.emit('tournament.stage.opened', stage.season.id, {
          stageId: stage.id,
          stageNumber: stage.stage_number,
        });
        this.logger.log(
          `Opened Stage ${stage.stage_number} of "${stage.season.name}" (${stage.id})`,
        );
      } catch (err) {
        this.logger.error(`Failed to open stage ${stage.id}:`, err);
      }
    }
  }

  /**
   * Every 5 minutes: close stages whose close_date has passed,
   * then run elimination and unlock the next stage.
   * OPEN → CLOSED
   */
  @Cron('*/5 * * * *')
  async closeDueStages() {
    if (!(await this.redis.acquireLock('lock:cron:closeDueStages', 290))) return;
    const now = new Date();

    const stagesToClose = await this.prisma.seasonStage.findMany({
      where: {
        status: 'OPEN',
        close_date: { lte: now },
        season: { status: 'ACTIVE' },
      },
      include: {
        season: {
          include: {
            stages: { orderBy: { stage_number: 'asc' }, select: { id: true, stage_number: true, status: true } },
          },
        },
      },
    });

    for (const stage of stagesToClose) {
      try {
        // 1. Run elimination (also sets stage status to CLOSED)
        const result = await this.eliminationService.runElimination(stage.id);
        this.logger.log(
          `Elimination for Stage ${stage.stage_number} of "${stage.season.name}": ` +
            `${result.survived} survived, ${result.eliminated} eliminated`,
        );
        this.events.emit('tournament.stage.closed', stage.season.id, {
          stageId: stage.id,
          stageNumber: stage.stage_number,
          survived: result.survived,
          eliminated: result.eliminated,
        });

        // 2. Check if this was the final stage
        const allStages = stage.season.stages;
        const maxStage = Math.max(...allStages.map((s) => s.stage_number));
        const isFinalStage = stage.stage_number === maxStage;

        if (isFinalStage) {
          // Mark season as completed
          await this.prisma.season.update({
            where: { id: stage.season.id },
            data: { status: 'COMPLETED' },
          });

          // Mark surviving entries as WINNER
          const survivingEntries = await this.prisma.stageEntry.findMany({
            where: { season_stage_id: stage.id, eliminated: false, completed_at: { not: null } },
            select: { season_entry_id: true },
          });

          if (survivingEntries.length > 0) {
            await this.prisma.seasonEntry.updateMany({
              where: { id: { in: survivingEntries.map((e) => e.season_entry_id) } },
              data: { status: 'WINNER' },
            });
          }

          // Distribute prizes
          await this.eliminationService.distributePrizes(stage.season.id, stage.id);

          this.events.emit('tournament.season.completed', stage.season.id, {
            finalStageId: stage.id,
            winners: survivingEntries.length,
          });

          this.logger.log(
            `Season "${stage.season.name}" completed. ${survivingEntries.length} winner(s).`,
          );
        } else {
          // 3. Unlock next stage (set to LOCKED — the openDueStages cron will open it at its open_date)
          const nextStage = allStages.find((s) => s.stage_number === stage.stage_number + 1);
          if (nextStage && nextStage.status === 'LOCKED') {
            // If the next stage's open_date is already in the past, open it immediately
            const nextStageRecord = await this.prisma.seasonStage.findUnique({
              where: { id: nextStage.id },
            });
            if (nextStageRecord && nextStageRecord.open_date <= now) {
              await this.prisma.seasonStage.update({
                where: { id: nextStage.id },
                data: { status: 'OPEN' },
              });
              this.logger.log(`Immediately opened Stage ${nextStage.stage_number}`);
            }
            // Otherwise the openDueStages cron will handle it when the time comes
          }
        }
      } catch (err) {
        this.logger.error(`Failed to close/eliminate stage ${stage.id}:`, err);
      }
    }
  }

  /**
   * Every hour: transition seasons from UPCOMING to REGISTRATION
   * when their start_date arrives.
   */
  @Cron('0 * * * *')
  async activateSeasons() {
    if (!(await this.redis.acquireLock('lock:cron:activateSeasons', 3500))) return;
    const now = new Date();

    const seasonsToActivate = await this.prisma.season.findMany({
      where: { status: 'UPCOMING', start_date: { lte: now } },
    });

    for (const season of seasonsToActivate) {
      try {
        await this.prisma.season.update({
          where: { id: season.id },
          data: { status: 'REGISTRATION' },
        });
        this.logger.log(`Season "${season.name}" opened for registration`);
      } catch (err) {
        this.logger.error(`Failed to activate season ${season.id}:`, err);
      }
    }
  }

  /**
   * Every 5 minutes: tear down CANCELLED seasons. Refund the entry fee for every
   * still-active registration (paid seasons only), mark those entries WITHDRAWN
   * and close any open stages. Idempotent: only ACTIVE entries are processed, so
   * re-runs never double-refund.
   */
  @Cron('*/5 * * * *')
  async processCancelledSeasons() {
    if (!(await this.redis.acquireLock('lock:cron:processCancelledSeasons', 290))) return;

    const cancelledSeasons = await this.prisma.season.findMany({
      where: {
        status: 'CANCELLED',
        entries: { some: { status: 'ACTIVE' } },
      },
      select: { id: true, name: true, entry_fee: true },
    });

    for (const season of cancelledSeasons) {
      try {
        const entryFee = season.entry_fee ? Number(season.entry_fee) : 0;

        const activeEntries = await this.prisma.seasonEntry.findMany({
          where: { season_id: season.id, status: 'ACTIVE' },
          select: { id: true, user_id: true },
        });

        for (const entry of activeEntries) {
          try {
            if (entryFee > 0) {
              await this.walletService.refundEntryFee(entry.user_id, season.id, entryFee);
            }
            // Mark WITHDRAWN only after a successful refund so a failed refund is
            // retried on the next run (idempotency: entry stays ACTIVE on failure).
            await this.prisma.seasonEntry.update({
              where: { id: entry.id },
              data: { status: 'WITHDRAWN' },
            });
          } catch (entryErr) {
            this.logger.error(
              `Failed to refund/withdraw entry ${entry.id} for cancelled season ${season.id}:`,
              entryErr as Error,
            );
          }
        }

        // Close any stages still open/locked for the cancelled season.
        await this.prisma.seasonStage.updateMany({
          where: { season_id: season.id, status: { in: ['LOCKED', 'OPEN'] } },
          data: { status: 'CLOSED' },
        });

        this.events.emit('tournament.season.cancelled', season.id, {
          refundedEntries: activeEntries.length,
          entryFee,
        });
        this.logger.log(
          `Cancelled season "${season.name}" teardown: processed ${activeEntries.length} active entr(y/ies).`,
        );
      } catch (err) {
        this.logger.error(`Failed to process cancelled season ${season.id}:`, err);
      }
    }
  }
}
