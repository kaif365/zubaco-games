import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AgeVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verify user is 18+ based on date of birth.
   * Required before entering paid tournaments or making deposits.
   */
  async verifyAge(userId: string, dateOfBirth: Date): Promise<{ verified: boolean }> {
    const dob = new Date(dateOfBirth);
    const today = new Date();

    // Calculate age
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 18) {
      throw new BadRequestException('You must be at least 18 years old to use paid features');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { date_of_birth: dob, age_verified: true },
    });

    return { verified: true };
  }

  /**
   * Check if user has verified their age. Used as a gate for paid features.
   */
  async ensureAgeVerified(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { age_verified: true },
    });

    if (!user?.age_verified) {
      throw new BadRequestException('Age verification required. You must be 18+ to participate in paid contests.');
    }
  }
}
