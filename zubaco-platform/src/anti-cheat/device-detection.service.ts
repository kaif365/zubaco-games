import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { CheatFlagType, CheatSeverity } from '.prisma/client';

export interface DeviceComponents {
  deviceId?: string;
  platform?: string;
  model?: string;
  brand?: string;
  osVersion?: string;
  screenResolution?: string;
  cpuCores?: number;
  memoryGb?: number;
  [key: string]: any;
}

export interface DeviceDetectionResult {
  flagged: boolean;
  flags: { type: CheatFlagType; severity: CheatSeverity; details: any }[];
}

export interface DeviceRiskReport {
  fingerprintHash: string;
  riskScore: number; // 0 - 100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  associatedAccountsCount: number;
  associatedUserIds: string[];
  hasBannedAccount: boolean;
  cheatFlagCount: number;
  factors: string[];
}

@Injectable()
export class DeviceDetectionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deterministically generates a SHA-256 device fingerprint hash from normalized components.
   */
  generateFingerprint(components: DeviceComponents): string {
    if (!components || typeof components !== 'object') {
      return '';
    }

    const normalizedKeys = Object.keys(components)
      .filter((k) => components[k] !== undefined && components[k] !== null && components[k] !== '')
      .sort();

    if (normalizedKeys.length === 0) {
      return '';
    }

    const canonicalParts: string[] = [];
    for (const key of normalizedKeys) {
      const val =
        typeof components[key] === 'string'
          ? components[key].trim().toLowerCase()
          : String(components[key]);
      canonicalParts.push(`${key.toLowerCase()}:${val}`);
    }

    const canonicalString = canonicalParts.join('|');
    return crypto.createHash('sha256').update(canonicalString).digest('hex');
  }

  /**
   * Detect if the same device fingerprint is used by multiple user accounts.
   * 2 users sharing = HIGH, 3+ users = CRITICAL (device farming).
   */
  async detectDuplicateDevice(userId: string, fingerprintHash: string): Promise<DeviceDetectionResult> {
    const flags: { type: CheatFlagType; severity: CheatSeverity; details: any }[] = [];

    if (!fingerprintHash) return { flagged: false, flags };

    // Find all users with this fingerprint (excluding current user)
    const sharedDevices = await this.prisma.deviceFingerprint.findMany({
      where: {
        fingerprint_hash: fingerprintHash,
        user_id: { not: userId },
      },
      select: { user_id: true, first_seen_at: true, session_count: true },
    });

    if (sharedDevices.length > 0) {
      const sharedUserIds = sharedDevices.map((d: { user_id: string }) => d.user_id);
      const totalAccounts = sharedDevices.length + 1; // shared users + current user
      // 2 accounts on one device = HIGH, 3+ accounts = CRITICAL (device farming).
      const severity: CheatSeverity = totalAccounts >= 3 ? 'CRITICAL' : 'HIGH';

      flags.push({
        type: 'DEVICE_DUPLICATE',
        severity,
        details: {
          fingerprint_hash: fingerprintHash,
          shared_users: sharedUserIds,
          shared_count: totalAccounts,
          detection_method: 'device_fingerprint',
        },
      });
    }

    return { flagged: flags.length > 0, flags };
  }

  /**
   * Detect if multiple users are playing from the same IP address in tournament mode.
   * >3 different users from same IP within 1 hour in tournament = flag all.
   */
  async detectIPCorrelation(
    userId: string,
    ipAddress: string,
    sessionId: string,
    mode: string,
  ): Promise<DeviceDetectionResult> {
    const flags: { type: CheatFlagType; severity: CheatSeverity; details: any }[] = [];

    if (!ipAddress || mode !== 'TOURNAMENT') return { flagged: false, flags };

    // Count distinct users from this IP in the last hour (tournament sessions only)
    const oneHourAgo = new Date(Date.now() - 3600000);

    const recentSessions = await this.prisma.gameSession.findMany({
      where: {
        ip_address: ipAddress,
        mode: 'TOURNAMENT',
        started_at: { gte: oneHourAgo },
        user_id: { not: userId },
      },
      distinct: ['user_id'],
      select: { user_id: true },
    });

    const otherUsers = recentSessions.map((s) => s.user_id);

    if (otherUsers.length >= 3) {
      flags.push({
        type: 'DEVICE_DUPLICATE',
        severity: 'HIGH',
        details: {
          ip_address: ipAddress,
          other_users_count: otherUsers.length,
          detection_method: 'ip_correlation',
          window: '1_hour',
          session_id: sessionId,
        },
      });
    }

    return { flagged: flags.length > 0, flags };
  }

  /**
   * Anti-Sybil tournament cohort isolation guard.
   * Prohibits multiple accounts using the same hardware device from entering the same tournament.
   */
  async validateTournamentCohortDevice(
    tournamentId: string,
    userId: string,
    fingerprintHash: string,
  ): Promise<{ allowed: boolean; reason?: string; conflictingUserId?: string }> {
    if (!tournamentId || !fingerprintHash) {
      return { allowed: true };
    }

    // Find other participants in the tournament
    const otherTournamentSessions = await this.prisma.gameSession.findMany({
      where: {
        tournament_id: tournamentId,
        user_id: { not: userId },
      },
      distinct: ['user_id'],
      select: { user_id: true },
    });

    if (otherTournamentSessions.length === 0) {
      return { allowed: true };
    }

    const otherUserIds = otherTournamentSessions.map((s) => s.user_id);

    // Check if any of these users registered this device fingerprint
    const conflict = await this.prisma.deviceFingerprint.findFirst({
      where: {
        fingerprint_hash: fingerprintHash,
        user_id: { in: otherUserIds },
      },
      select: { user_id: true },
    });

    if (conflict) {
      return {
        allowed: false,
        reason: 'COLLUSION_DEVICE_COHORT_VIOLATION',
        conflictingUserId: conflict.user_id,
      };
    }

    return { allowed: true };
  }

  /**
   * Prevents simultaneous active sessions on the same device across different or same accounts.
   */
  async checkActiveDeviceSession(
    fingerprintHash: string,
    currentSessionId?: string,
  ): Promise<{ hasActiveSession: boolean; activeSessionId?: string; userId?: string }> {
    if (!fingerprintHash) {
      return { hasActiveSession: false };
    }

    // Find all users linked to this device fingerprint
    const linkedDevices = await this.prisma.deviceFingerprint.findMany({
      where: { fingerprint_hash: fingerprintHash },
      select: { user_id: true },
    });

    if (linkedDevices.length === 0) {
      return { hasActiveSession: false };
    }

    const userIds = linkedDevices.map((d) => d.user_id);

    // Look for in-progress session in the last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const activeSession = await this.prisma.gameSession.findFirst({
      where: {
        user_id: { in: userIds },
        outcome: null,
        id: currentSessionId ? { not: currentSessionId } : undefined,
        started_at: { gte: fifteenMinutesAgo },
      },
      select: { id: true, user_id: true },
    });

    if (activeSession) {
      return {
        hasActiveSession: true,
        activeSessionId: activeSession.id,
        userId: activeSession.user_id,
      };
    }

    return { hasActiveSession: false };
  }

  /**
   * Computes a device risk score (0-100) and multi-accounting risk profile.
   */
  async calculateDeviceRiskScore(fingerprintHash: string): Promise<DeviceRiskReport> {
    const factors: string[] = [];
    let riskScore = 0;

    if (!fingerprintHash) {
      return {
        fingerprintHash: '',
        riskScore: 0,
        riskLevel: 'LOW',
        associatedAccountsCount: 0,
        associatedUserIds: [],
        hasBannedAccount: false,
        cheatFlagCount: 0,
        factors: ['no_fingerprint_provided'],
      };
    }

    const linkedDevices = await this.prisma.deviceFingerprint.findMany({
      where: { fingerprint_hash: fingerprintHash },
      include: {
        user: {
          select: { id: true, is_banned: true },
        },
      },
    });

    const userIds = linkedDevices.map((d) => d.user_id);
    const accountsCount = userIds.length;

    if (accountsCount === 2) {
      riskScore += 30;
      factors.push('dual_account_sharing');
    } else if (accountsCount >= 3) {
      riskScore += 70;
      factors.push(`multi_account_farm_cluster_${accountsCount}`);
    }

    // Check for banned accounts on this device
    const hasBanned = linkedDevices.some((d) => d.user?.is_banned);
    if (hasBanned) {
      riskScore += 80;
      factors.push('banned_account_associated');
    }

    // Check for cheat flags on associated users
    let cheatFlagCount = 0;
    if (userIds.length > 0) {
      cheatFlagCount = await this.prisma.cheatFlag.count({
        where: { user_id: { in: userIds } },
      });
      if (cheatFlagCount > 0) {
        const flagAddition = Math.min(30, cheatFlagCount * 10);
        riskScore += flagAddition;
        factors.push(`associated_cheat_flags_${cheatFlagCount}`);
      }
    }

    const clampedScore = Math.min(100, riskScore);
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (clampedScore > 75) riskLevel = 'CRITICAL';
    else if (clampedScore > 50) riskLevel = 'HIGH';
    else if (clampedScore > 25) riskLevel = 'MEDIUM';

    return {
      fingerprintHash,
      riskScore: clampedScore,
      riskLevel,
      associatedAccountsCount: accountsCount,
      associatedUserIds: userIds,
      hasBannedAccount: hasBanned,
      cheatFlagCount,
      factors,
    };
  }

  /**
   * Register/update a device fingerprint for a user.
   * Creates new record or increments session_count + updates last_seen_at.
   */
  async upsertFingerprint(userId: string, fingerprintHash: string, components?: any): Promise<void> {
    if (!fingerprintHash) return;

    await this.prisma.deviceFingerprint.upsert({
      where: {
        user_id_fingerprint_hash: { user_id: userId, fingerprint_hash: fingerprintHash },
      },
      create: {
        user_id: userId,
        fingerprint_hash: fingerprintHash,
        components: components || {},
      },
      update: {
        last_seen_at: new Date(),
        session_count: { increment: 1 },
        components: components || undefined,
      },
    });
  }
}
