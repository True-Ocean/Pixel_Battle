import { describe, expect, it } from 'vitest';
import { brushSideLength } from './brushSize';

describe('brushSize', () => {
  it('小中大は常に 1・2・3 マス', () => {
    expect(brushSideLength('small')).toBe(1);
    expect(brushSideLength('medium')).toBe(2);
    expect(brushSideLength('large')).toBe(3);
  });
});
