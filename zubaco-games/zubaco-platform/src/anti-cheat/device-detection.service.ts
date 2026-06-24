import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CheatFlagType, CheatSeverity } from '.prisma/client';

export interface DeviceDetectionResult {
  flagged: boolean;
  flags: { type: CheatFlagType; severity: CheatSeverity; details: any }[];
}

@Injectable()
export class DeviceDetectionService {
  constructor(private readonly prisma: PrismaService) {}

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
      const sharedUserIds = sharedDevices.map((d) => d.user_id);
      const severity: CheatSeverity = sharedDevices.length >= 2 ? 'CRITICAL' : 'HIGH';

      flags.push({
        type: 'DEVICE_DUPLICATE',
        severity,
        details: {
          fingerprint_hash: fingerprintHash,
          shared_users: sharedUserIds,
          shared_count: sharedDevices.length + 1, // +1 for current user
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
