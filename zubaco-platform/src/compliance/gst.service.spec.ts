import { GstService } from './gst.service';

/**
 * Unit tests for GstService — 28% GST money calculations on entry fees.
 * Pure arithmetic (no dependencies); money must be exact to 2 decimals.
 */
describe('GstService', () => {
  let service: GstService;

  beforeEach(() => {
    service = new GstService();
  });

  describe('calculateGstInclusive', () => {
    it('extracts the GST portion from a GST-inclusive fee (round face value)', () => {
      const r = service.calculateGstInclusive(128);
      expect(r.baseAmount).toBe(100);
      expect(r.gstAmount).toBe(28);
      expect(r.totalAmount).toBe(128);
    });

    it('rounds base and GST to two decimals for a ₹100 inclusive fee', () => {
      const r = service.calculateGstInclusive(100);
      expect(r.baseAmount).toBe(78.13);
      expect(r.gstAmount).toBe(21.87);
      expect(r.totalAmount).toBe(100);
      // base + gst reconstitutes the total.
      expect(r.baseAmount + r.gstAmount).toBeCloseTo(100, 2);
    });

    it('handles a zero entry fee without producing NaN', () => {
      const r = service.calculateGstInclusive(0);
      expect(r.baseAmount).toBe(0);
      expect(r.gstAmount).toBe(0);
      expect(r.totalAmount).toBe(0);
    });
  });

  describe('calculateGstExclusive', () => {
    it('adds 28% GST on top of the base entry fee', () => {
      const r = service.calculateGstExclusive(100);
      expect(r.baseAmount).toBe(100);
      expect(r.gstAmount).toBe(28);
      expect(r.totalAmount).toBe(128);
    });

    it('rounds the GST component to two decimals', () => {
      const r = service.calculateGstExclusive(49.99);
      expect(r.gstAmount).toBe(14); // round(49.99 × 0.28) = round(13.9972) = 14
      expect(r.totalAmount).toBe(63.99);
    });
  });

  describe('getGstBreakdown', () => {
    it('returns the display fields matching the inclusive calculation', () => {
      const r = service.getGstBreakdown(100);
      expect(r.baseAmount).toBe(78.13);
      expect(r.gstAmount).toBe(21.87);
      expect(r.gstRate).toBe('28%');
      expect(r.displayText).toContain('28% GST');
    });
  });
});
