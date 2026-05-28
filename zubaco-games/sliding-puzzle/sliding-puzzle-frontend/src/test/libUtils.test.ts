import { cn } from '../lib/utils';

describe('utils', () => {
  describe('cn', () => {
    it('merges class names', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('handles conditional classes', () => {
      expect(cn('items-center', { flex: true, hidden: false })).toBe('items-center flex');
    });

    it('merges tailwind classes correctly', () => {
      // px-2 and px-4 should merge to px-4
      expect(cn('px-2', 'px-4')).toBe('px-4');
    });
  });
});
