import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class EliminationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run elimination for a given stage.
   * Bottom X% of players by score are eliminated.
   * Tiebreaker: total time (lower = better).
   */
  async runElimination(seasonStageId: string) {
    const stage = await this.prisma.seasonStage.findUnique({
      where: { id: seasonStageId },
    });

    if (!stage) throw new Error('Stage not found');

    // Get all completed stage entries
    const entries = await this.prisma.stageEntry.findMany({
      where: {
        season_stage_id: seasonStageId,
        completed_at: { not: null },
      },
      orderBy: [
        { total_score: 'desc' },
        { total_time_ms: 'asc' }, // Tiebreaker: faster wins
      ],
      include: { season_entry: true },
    });

    if (entries.length === 0) return { eliminated: 0, survived: 0 };

    // Calculate cutoff
    const eliminationPct = stage.elimination_pct / 100;
    const surviveCount = Math.ceil(entries.length * (1 - eliminationPct));

    // Assign ranks
    const updates = entries.map((entry, index) => {
      const rank = index + 1;
      const eliminated = rank > surviveCount;

      return this.prisma.stageEntry.update({
        where: { id: entry.id },
        data: { rank, eliminated },
      });
    });

    await this.prisma.$transaction(updates);

    // Update season entries for eliminated players
    const eliminatedEntries = entries.slice(surviveCount);
    if (eliminatedEntries.length > 0) {
      await this.prisma.seasonEntry.updateMany({
        where: { id: { in: eliminatedEntries.map((e) => e.season_entry_id) } },
        data: { status: 'ELIMINATED' },
      });
    }

    // Close stage
    await this.prisma.seasonStage.update({
      where: { id: seasonStageId },
      data: { status: 'CLOSED' },
    });

    return {
      total_players: entries.length,
      survived: surviveCount,
      eliminated: entries.length - surviveCount,
    };
  }

  /**
   * Get stage rankings
   */
  async getStageRankings(seasonStageId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      this.prisma.stageEntry.findMany({
        where: { season_stage_id: seasonStageId, completed_at: { not: null } },
        orderBy: [{ total_score: 'desc' }, { total_time_ms: 'asc' }],
        skip,
        take: limit,
        include: {
          season_entry: {
            include: { user: { select: { id: true, username: true, display_name: true, avatar_url: true } } },
          },
        },
      }),
      this.prisma.stageEntry.count({
        where: { season_stage_id: seasonStageId, completed_at: { not: null } },
      }),
    ]);

    return {
      rankings: entries.map((e, i) => ({
        rank: skip + i + 1,
        user: e.season_entry.user,
        total_score: e.total_score,
        total_time_ms: e.total_time_ms,
        eliminated: e.eliminated,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
