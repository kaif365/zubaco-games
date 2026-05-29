import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BankAccountType } from '.prisma/client';

@Injectable()
export class BankDetailService {
  constructor(private readonly prisma: PrismaService) {}

  async addBankAccount(
    userId: string,
    data: {
      account_type: BankAccountType;
      account_holder: string;
      account_number?: string;
      ifsc_code?: string;
      upi_id?: string;
    },
  ) {
    if (data.account_type === 'BANK_ACCOUNT') {
      if (!data.account_number || !data.ifsc_code) {
        throw new BadRequestException('Account number and IFSC code required for bank account');
      }
    } else if (data.account_type === 'UPI') {
      if (!data.upi_id) {
        throw new BadRequestException('UPI ID required');
      }
    }

    // If this is the first bank detail, make it primary
    const count = await this.prisma.bankDetail.count({ where: { user_id: userId } });

    return this.prisma.bankDetail.create({
      data: {
        user_id: userId,
        account_type: data.account_type,
        account_holder: data.account_holder,
        account_number: data.account_number,
        ifsc_code: data.ifsc_code,
        upi_id: data.upi_id,
        is_primary: count === 0,
      },
    });
  }

  async getBankDetails(userId: string) {
    return this.prisma.bankDetail.findMany({
      where: { user_id: userId },
      orderBy: { is_primary: 'desc' },
    });
  }

  async setPrimary(userId: string, bankDetailId: string) {
    const detail = await this.prisma.bankDetail.findFirst({ where: { id: bankDetailId, user_id: userId } });
    if (!detail) throw new NotFoundException('Bank detail not found');

    // Unset all others
    await this.prisma.bankDetail.updateMany({ where: { user_id: userId }, data: { is_primary: false } });
    return this.prisma.bankDetail.update({ where: { id: bankDetailId }, data: { is_primary: true } });
  }

  async deleteBankDetail(userId: string, bankDetailId: string) {
    const detail = await this.prisma.bankDetail.findFirst({ where: { id: bankDetailId, user_id: userId } });
    if (!detail) throw new NotFoundException('Bank detail not found');
    await this.prisma.bankDetail.delete({ where: { id: bankDetailId } });
    return { message: 'Bank detail removed' };
  }

  async getPrimaryForPayout(userId: string) {
    const primary = await this.prisma.bankDetail.findFirst({
      where: { user_id: userId, is_primary: true, verified: true },
    });
    if (!primary) throw new BadRequestException('No verified primary bank detail found. Add and verify bank details before withdrawing.');
    return primary;
  }

  /**
   * Cooling period: If any bank detail was added/changed in the last 48 hours,
   * block withdrawals to prevent fraud after account takeover.
   */
  async checkCoolingPeriod(userId: string): Promise<void> {
    const coolingHours = 48;
    const cooldownThreshold = new Date(Date.now() - coolingHours * 60 * 60 * 1000);

    const recentChange = await this.prisma.bankDetail.findFirst({
      where: {
        user_id: userId,
        OR: [
          { created_at: { gt: cooldownThreshold } },
          { updated_at: { gt: cooldownThreshold } },
        ],
      },
    });

    if (recentChange) {
      throw new BadRequestException(
        'Withdrawals are temporarily blocked for 48 hours after adding or modifying bank details. This is a security measure.',
      );
    }
  }
}
