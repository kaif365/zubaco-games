import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';

/**
 * Default platform settings. These are seeded on first boot if not present.
 */
const DEFAULT_SETTINGS: Array<{ key: string; value: string; description: string; category: string }> = [
  { key: 'referral_bonus_amount', value: '50', description: 'Bonus amount (INR) for referral', category: 'wallet' },
  { key: 'min_withdrawal_amount', value: '100', description: 'Minimum withdrawal (INR)', category: 'wallet' },
  { key: 'max_daily_deposits', value: '10000', description: 'Max daily deposit limit (INR)', category: 'wallet' },
  { key: 'platform_fee_pct', value: '10', description: 'Platform fee percentage on entry', category: 'wallet' },
  { key: 'tds_rate_pct', value: '30', description: 'TDS deduction rate on net winnings (%)', category: 'compliance' },
  { key: 'energy_max_lives', value: '5', description: 'Maximum free play lives', category: 'gameplay' },
  { key: 'energy_recharge_minutes', value: '30', description: 'Minutes per life recharge', category: 'gameplay' },
  { key: 'bonus_lives_per_ad', value: '1', description: 'Lives earned per ad watch', category: 'gameplay' },
  { key: 'max_sessions_per_hour', value: '20', description: 'Anti-cheat: max sessions/hour before flag', category: 'anti_cheat' },
  { key: 'auto_ban_critical_flags', value: '3', description: 'Auto-ban after N critical flags', category: 'anti_cheat' },
  { key: 'score_anomaly_std_devs', value: '3', description: 'Score anomaly detection threshold (std devs)', category: 'anti_cheat' },
  { key: 'default_stage_elimination_pct', value: '50', description: 'Default elimination % for new stages', category: 'tournament' },
  { key: 'max_players_per_cohort', value: '100', description: 'Max players per tournament cohort', category: 'tournament' },
  { key: 'season_registration_days', value: '3', description: 'Days registration stays open before season starts', category: 'tournament' },
  { key: 'min_age_for_paid_tournaments', value: '18', description: 'Minimum age for paid entry', category: 'compliance' },
  { key: 'kyc_required_above', value: '10000', description: 'KYC required for winnings above (INR)', category: 'compliance' },
];

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  async getAll() {
    const settings = await this.prisma.systemSetting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
    return { settings };
  }

  async get(key: string): Promise<string | null> {
    const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
    return setting?.value ?? null;
  }

  async updateMany(updates: Array<{ key: string; value: string }>) {
    const results = await Promise.all(
      updates.map((u) =>
        this.prisma.systemSetting.update({
          where: { key: u.key },
          data: { value: u.value, updated_at: new Date() },
        }),
      ),
    );
    return { updated: results.length };
  }

  private async seedDefaults() {
    for (const setting of DEFAULT_SETTINGS) {
      await this.prisma.systemSetting.upsert({
        where: { key: setting.key },
        create: setting,
        update: {}, // Don't overwrite existing values
      });
    }
  }
}
