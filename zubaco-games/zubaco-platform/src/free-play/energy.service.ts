import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

const MAX_LIVES = 5;
const RECHARGE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour per life

@Injectable()
export class EnergyService {
  constructor(private readonly prisma: PrismaService) {}

  async getEnergy(userId: string) {
    let energy = await this.prisma.userEnergy.findUnique({
      where: { user_id: userId },
    });

    if (!energy) {
      energy = await this.prisma.userEnergy.create({
        data: { user_id: userId, current_lives: MAX_LIVES, max_lives: MAX_LIVES },
      });
    }

    // Calculate recharged lives since last check
    const recharged = this.calculateRechargedLives(energy.current_lives, energy.max_lives, energy.last_recharged_at);

    if (recharged.livesAdded > 0) {
      energy = await this.prisma.userEnergy.update({
        where: { user_id: userId },
        data: {
          current_lives: recharged.newLives,
          last_recharged_at: recharged.newRechargeTime,
        },
      });
    }

    const nextRechargeIn = energy.current_lives >= energy.max_lives
      ? null
      : RECHARGE_INTERVAL_MS - (Date.now() - energy.last_recharged_at.getTime()) % RECHARGE_INTERVAL_MS;

    return {
      current_lives: energy.current_lives,
      max_lives: energy.max_lives,
      bonus_lives: energy.bonus_lives,
      total_available: energy.current_lives + energy.bonus_lives,
      next_recharge_in_ms: nextRechargeIn,
      full_recharge_at: energy.current_lives >= energy.max_lives
        ? null
        : new Date(Date.now() + (energy.max_lives - energy.current_lives) * RECHARGE_INTERVAL_MS).toISOString(),
    };
  }

  async consumeLife(userId: string): Promise<boolean> {
    const energy = await this.getEnergy(userId);

    if (energy.total_available <= 0) {
      throw new BadRequestException('No lives remaining. Wait for recharge or purchase more.');
    }

    // Consume bonus lives first, then regular lives
    if (energy.bonus_lives > 0) {
      await this.prisma.userEnergy.update({
        where: { user_id: userId },
        data: { bonus_lives: { decrement: 1 } },
      });
    } else {
      await this.prisma.userEnergy.update({
        where: { user_id: userId },
        data: {
          current_lives: { decrement: 1 },
          last_recharged_at: new Date(), // Reset recharge timer
        },
      });
    }

    return true;
  }

  async addBonusLives(userId: string, amount: number) {
    await this.prisma.userEnergy.upsert({
      where: { user_id: userId },
      create: { user_id: userId, current_lives: MAX_LIVES, max_lives: MAX_LIVES, bonus_lives: amount },
      update: { bonus_lives: { increment: amount } },
    });
  }

  async refillLives(userId: string) {
    // Full refill (used for purchased refills)
    await this.prisma.userEnergy.upsert({
      where: { user_id: userId },
      create: { user_id: userId, current_lives: MAX_LIVES, max_lives: MAX_LIVES },
      update: { current_lives: MAX_LIVES, last_recharged_at: new Date() },
    });
  }

  private calculateRechargedLives(
    currentLives: number,
    maxLives: number,
    lastRechargedAt: Date,
  ) {
    if (currentLives >= maxLives) {
      return { livesAdded: 0, newLives: currentLives, newRechargeTime: lastRechargedAt };
    }

    const elapsed = Date.now() - lastRechargedAt.getTime();
    const livesToAdd = Math.floor(elapsed / RECHARGE_INTERVAL_MS);

    if (livesToAdd <= 0) {
      return { livesAdded: 0, newLives: currentLives, newRechargeTime: lastRechargedAt };
    }

    const newLives = Math.min(maxLives, currentLives + livesToAdd);
    const actualAdded = newLives - currentLives;
    const newRechargeTime = new Date(lastRechargedAt.getTime() + actualAdded * RECHARGE_INTERVAL_MS);

    return { livesAdded: actualAdded, newLives, newRechargeTime };
  }
}
