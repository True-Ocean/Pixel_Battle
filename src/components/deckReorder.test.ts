import { describe, expect, it } from 'vitest';
import { getDeckRowShift, reorderDeckItems } from './deckReorder';

describe('reorderDeckItems', () => {
  it('moves an item within the array', () => {
    expect(reorderDeckItems(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(reorderDeckItems(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('returns a copy when indices are invalid or equal', () => {
    expect(reorderDeckItems(['a'], 0, 0)).toEqual(['a']);
    expect(reorderDeckItems(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
  });
});

describe('getDeckRowShift', () => {
  it('shifts rows between source and drop indices', () => {
    expect(getDeckRowShift(0, 1, 3)).toBe(0);
    expect(getDeckRowShift(1, 1, 3)).toBe(0);
    expect(getDeckRowShift(2, 1, 3)).toBe(-1);
    expect(getDeckRowShift(3, 1, 3)).toBe(-1);
    expect(getDeckRowShift(3, 3, 1)).toBe(0);
    expect(getDeckRowShift(1, 3, 1)).toBe(1);
    expect(getDeckRowShift(2, 3, 1)).toBe(1);
  });
});
