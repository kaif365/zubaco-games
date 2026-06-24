import { Injectable } from '@nestjs/common';

/**
 * GST on online gaming in India.
 * 
 * As per GST Council decision (October 2023):
 * - 28% GST on the FULL FACE VALUE of entry fees (not just platform commission)
 * - Applies to all online money gaming
 * - GST is inclusive in the entry fee displayed to user
 */
@Injectable()
export class GstService {
  private readonly GST_RATE = 0.28; // 28%

  /**
   * Calculate GST component from an entry fee amount.
   * Entry fee is GST-inclusive, so we extract the GST portion.
   * 
   * If entry fee = ₹100 (inclusive of GST):
   *   Base amount = 100 / 1.28 = ₹78.13
   *   GST = 100 - 78.13 = ₹21.87
   */
  calculateGstInclusive(entryFee: number): { baseAmount: number; gstAmount: number; totalAmount: number } {
    const baseAmount = Math.round((entryFee / (1 + this.GST_RATE)) * 100) / 100;
    const gstAmount = Math.round((entryFee - baseAmount) * 100) / 100;

    return {
      baseAmount,
      gstAmount,
      totalAmount: entryFee,
    };
  }

  /**
   * Calculate entry fee with GST added on top.
   * Use this when displaying "Entry fee: ₹X (incl. 28% GST)"
   * 
   * If base entry = ₹100:
   *   GST = 100 * 0.28 = ₹28
   *   Total = ₹128
   */
  calculateGstExclusive(baseEntryFee: number): { baseAmount: number; gstAmount: number; totalAmount: number } {
    const gstAmount = Math.round(baseEntryFee * this.GST_RATE * 100) / 100;
    const totalAmount = Math.round((baseEntryFee + gstAmount) * 100) / 100;

    return {
      baseAmount: baseEntryFee,
      gstAmount,
      totalAmount,
    };
  }

  /**
   * Get GST breakdown for display purposes
   */
  getGstBreakdown(entryFee: number): {
    displayText: string;
    baseAmount: number;
    gstAmount: number;
    gstRate: string;
  } {
    const { baseAmount, gstAmount } = this.calculateGstInclusive(entryFee);
    return {
      displayText: `₹${entryFee} (incl. 28% GST of ₹${gstAmount})`,
      baseAmount,
      gstAmount,
      gstRate: '28%',
    };
  }
}
