import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class EliminationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run elimination for a given stage.
   *
   * Pre-bucketing stages (stage_number <= season.bucketing_stage) eliminate the
   * bottom X% WITHIN each weekly bucket, so users only ever compete against
   * others who registered in the same week. Post-bucketing stages merge all
   * surviving buckets into one unified pool and eliminate across the whole field.
   *
   * Tiebreaker in all cases: lower total time wins.
   */
  async runElimination(seasonStageId: string) {
    const stage = await this.prisma.seasonStage.findUnique({
      where: { id: seasonStageId },
      include: { season: true },
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

    const eliminationPct = stage.elimination_pct / 100;
    const bucketingStage = (stage.season as any)?.bucketing_stage ?? 3;
    const preBucketing = stage.stage_number <= bucketingStage;

    // Partition entries into competition pools. Pre-bucketing => one pool per
    // weekly bucket (cohort); post-bucketing => a single unified pool.
    const pools = new Map<string, typeof entries>();
    for (const entry of entries) {
      const key = preBucketing ? entry.season_entry.cohort_id ?? 'no-cohort' : 'unified';
      const pool = pools.get(key);
      if (pool) pool.push(entry);
      else pools.set(key, [entry]);
    }

    const updates: any[] = [];
    const eliminatedIds: string[] = [];
    let totalSurvived = 0;

    for (const pool of pools.values()) {
      // Entries are already globally sorted; the relative order holds per pool.
      const surviveCount = Math.ceil(pool.length * (1 - eliminationPct));
      totalSurvived += surviveCount;
      pool.forEach((entry, index) => {
        const rank = index + 1; // rank within the pool
        const eliminated = rank > surviveCount;
        if (eliminated) eliminatedIds.push(entry.season_entry_id);
        updates.push(
          this.prisma.stageEntry.update({
            where: { id: entry.id },
            data: { rank, eliminated },
          }),
        );
      });
    }

    await this.prisma.$transaction(updates);

    // Update season entries for eliminated players
    if (eliminatedIds.length > 0) {
      await this.prisma.seasonEntry.updateMany({
        where: { id: { in: eliminatedIds } },
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
      survived: totalSurvived,
      eliminated: entries.length - totalSurvived,
      pools: pools.size,
      mode: preBucketing ? 'per-bucket' : 'unified',
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
