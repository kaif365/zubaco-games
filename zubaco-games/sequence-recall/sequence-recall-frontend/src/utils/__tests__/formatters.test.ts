import { capitalize, formatDuration, formatScore, truncate } from '../formatters';

describe('formatScore', () => {
  it('formats large numbers with commas', () => {
    expect(formatScore(1000000)).toBe('1,000,000');
  });

  it('handles zero', () => {
    expect(formatScore(0)).toBe('0');
  });

  it('handles small numbers', () => {
    expect(formatScore(42)).toBe('42');
  });
});

describe('formatDuration', () => {
  it('formats seconds under a minute', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('pads seconds with leading zero', () => {
    expect(formatDuration(65)).toBe('1:05');
  });

  it('formats exactly one minute', () => {
    expect(formatDuration(60)).toBe('1:00');
  });
});

describe('truncate', () => {
  it('returns original string when within limit', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates and appends ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });

  it('handles exactly at limit', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });
});

describe('capitalize', () => {
  it('capitalizes first letter and lowercases rest', () => {
    expect(capitalize('hELLO')).toBe('Hello');
  });

  it('handles empty string', () => {
    expect(capitalize('')).toBe('');
  });

  it('handles single character', () => {
    expect(capitalize('a')).toBe('A');
  });
});
