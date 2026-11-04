import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';

export const MIN_COHORT_SIZE = 50;
export const TARGET_COHORT_SIZE = 75;
export const MAX_COHORT_SIZE = 100;
export const CONSOLIDATION_MIN_THRESHOLD = 25;

export interface CohortAssignmentResult {
  cohortId: string;
  cohortName: string;
  shardIndex: number;
  totalCohorts: number;
}

export interface PercentileCutoffResult {
  totalParticipants: number;
  advancingCount: number;
  eliminatedCount: number;
  advancementPercentage: number;
}

/**
 * Deterministically compute cohort shard index via SHA-256 consistent hash.
 * hash(userId + ":" + tournamentId) % K
 */
export function computeConsistentCohortShard(
  userId: string,
  tournamentId: string,
  totalCohorts: number,
): number {
  if (totalCohorts <= 1) return 0;
  const hash = crypto.createHash('sha256').update(`${userId}:${tournamentId}`).digest('hex');
  const numericValue = parseInt(hash.substring(0, 8), 16);
  return numericValue % totalCohorts;
}

/**
 * Calculate the number of balanced cohorts for N players ensuring 50-100 player target size.
 */
export function calculateRequiredCohorts(totalPlayers: number): number {
  if (totalPlayers <= MAX_COHORT_SIZE) return 1;
  return Math.max(1, Math.round(totalPlayers / TARGET_COHORT_SIZE));
}

/**
 * Strict ceiling percentile elimination cut-off.
 * Advancing count = max(1, ceil(M * (1 - eliminationPct/100)))
 */
export function calculatePercentileCutoff(
  participantCount: number,
  eliminationPct: number,
): PercentileCutoffResult {
  if (participantCount <= 0) {
    return {
      totalParticipants: 0,
      advancingCount: 0,
      eliminatedCount: 0,
      advancementPercentage: 0,
    };
  }

  if (participantCount === 1) {
    return {
      totalParticipants: 1,
      advancingCount: 1,
      eliminatedCount: 0,
      advancementPercentage: 100,
    };
  }

  const clampedPct = Math.max(0, Math.min(100, eliminationPct));
  const advanceRate = (100 - clampedPct) / 100;
  const advancingCount = Math.max(1, Math.ceil(participantCount * advanceRate));
  const eliminatedCount = participantCount - advancingCount;

  return {
    totalParticipants: participantCount,
    advancingCount,
    eliminatedCount,
    advancementPercentage: Math.round((advancingCount / participantCount) * 100),
  };
}

@Injectable()
export class CohortMatchmakingService {
  private readonly logger = new Logger(CohortMatchmakingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deterministically assign a user to a balanced 50-100 player cohort.
   * Uses consistent hashing to distribute players across shards without database lock contention.
   */
  async assignUserToBalancedCohort(
    userId: string,
    seasonId: string,
    projectedTotalPlayers: number = 100,
  ): Promise<CohortAssignmentResult> {
    const totalCohorts = calculateRequiredCohorts(projectedTotalPlayers);
    const shardIndex = computeConsistentCohortShard(userId, seasonId, totalCohorts);
    const cohortName = `Cohort ${shardIndex + 1}`;

    // Find or create cohort record in Prisma
    let cohort = await this.prisma.cohort.findFirst({
      where: { season_id: seasonId, name: cohortName },
    });

    if (!cohort) {
      try {
        cohort = await this.prisma.cohort.create({
          data: {
            season_id: seasonId,
            name: cohortName,
          },
        });
      } catch {
        // Handle concurrent create race
        cohort = await this.prisma.cohort.findFirst({
          where: { season_id: seasonId, name: cohortName },
        });
      }
    }

    this.logger.debug(
      `Assigned user ${userId} to ${cohortName} (shard ${shardIndex}/${totalCohorts}) for season ${seasonId}`,
    );

    return {
      cohortId: cohort?.id ?? 'default-cohort',
      cohortName,
      shardIndex,
      totalCohorts,
    };
  }

  /**
   * Consolidate orphaned cohorts that fall below the 25-player threshold after elimination
   * or registration close, merging underpopulated brackets into the smallest adjacent cohort.
   */
  async consolidateOrphanCohorts(seasonId: string): Promise<number> {
    const cohorts = await this.prisma.cohort.findMany({
      where: { season_id: seasonId },
      include: { _count: { select: { entries: true } } },
      orderBy: { name: 'asc' },
    });

    if (cohorts.length <= 1) return 0;

    let mergedCount = 0;
    const underpopulated = cohorts.filter((c) => c._count.entries < CONSOLIDATION_MIN_THRESHOLD);

    for (const orphan of underpopulated) {
      // Find candidate target cohort (the smallest cohort with >= 25 entries or another orphan)
      const target = cohorts
        .filter((c) => c.id !== orphan.id)
        .sort((a, b) => a._count.entries - b._count.entries)[0];

      if (target) {
        await this.prisma.seasonEntry.updateMany({
          where: { season_id: seasonId, cohort_id: orphan.id },
          data: { cohort_id: target.id },
        });

        // Delete empty orphan cohort
        await this.prisma.cohort.delete({ where: { id: orphan.id } }).catch(() => {});
        mergedCount++;
        this.logger.log(
          `Consolidated orphan cohort ${orphan.name} (${orphan._count.entries} players) into ${target.name}`,
        );
      }
    }

    return mergedCount;
  }
}
