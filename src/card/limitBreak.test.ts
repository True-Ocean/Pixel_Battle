import { describe, expect, it } from 'vitest';
import { formatLimitBreakStars, getLimitBreakStarColor } from './limitBreak';

describe('formatLimitBreakStars', () => {
  it('★数に応じた表示', () => {
    expect(formatLimitBreakStars(0)).toBe('☆☆☆');
    expect(formatLimitBreakStars(1)).toBe('★☆☆');
    expect(formatLimitBreakStars(2)).toBe('★★☆');
    expect(formatLimitBreakStars(3)).toBe('★★★');
  });
});

describe('getLimitBreakStarColor', () => {
  it('獲得★はレア枠色、未獲得はグレー', () => {
    expect(getLimitBreakStarColor(true, 'SR')).toBe('#c9a227');
    expect(getLimitBreakStarColor(false, 'SR')).toBe('#c8ced8');
  });
});
