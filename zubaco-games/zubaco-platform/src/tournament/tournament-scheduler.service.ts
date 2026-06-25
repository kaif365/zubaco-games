import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { EliminationService } from './elimination.service';

@Injectable()
export class TournamentSchedulerService {
  private readonly logger = new Logger(TournamentSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eliminationService: EliminationService,
  ) {}

  /**
   * Every 5 minutes: open stages whose open_date has passed
   * LOCKED → OPEN
   */
  @Cron('*/5 * * * *')
  async openDueStages() {
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
    const now = new Date();

    const stagesToClose = await this.prisma.seasonStage.findMany({
      where: {
        status: 'OPEN',
        close_date: { lte: now },
        season: { status: 'ACTIVE' },
      },
      include: {
        season: {
          select: { id: true, name: true },
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
}
