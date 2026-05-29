import { describe, expect, it, vi, beforeEach } from 'vitest';

import { resolveImageUrl } from '@/utils/resolveImageUrl';

describe('resolveImageUrl', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns absolute http/https URLs as-is', () => {
    expect(resolveImageUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(resolveImageUrl('http://cdn.example.com/a.jpg')).toBe('http://cdn.example.com/a.jpg');
  });

  it('resolves relative URL using VITE_CLOUDFRONT_URL when set', () => {
    vi.stubEnv('VITE_CLOUDFRONT_URL', 'https://assets.example.com');

    expect(resolveImageUrl('/uploads/a.jpg')).toBe('https://assets.example.com/uploads/a.jpg');
  });

  it('handles relative path without leading slash', () => {
    vi.stubEnv('VITE_CLOUDFRONT_URL', 'https://assets.example.com');

    expect(resolveImageUrl('uploads/a.jpg')).toBe('https://assets.example.com/uploads/a.jpg');
  });

  it('returns path as-is when VITE_CLOUDFRONT_URL is not set', () => {
    vi.stubEnv('VITE_CLOUDFRONT_URL', '');

    expect(resolveImageUrl('/uploads/a.jpg')).toBe('/uploads/a.jpg');
  });

  it('returns null for null or undefined input', () => {
    expect(resolveImageUrl(null)).toBeNull();
    expect(resolveImageUrl(undefined)).toBeNull();
    expect(resolveImageUrl('')).toBeNull();
  });
});
