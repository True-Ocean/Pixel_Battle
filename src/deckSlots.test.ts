import { describe, expect, it } from 'vitest';
import {
  clampUnlockedDeckCount,
  createEmptyDeckSlots,
  isDeckSlotUnlocked,
  normalizeDeckSlots,
  updateDeckAtIndex,
} from './deckSlots';

describe('deckSlots', () => {
  it('creates five empty deck slots', () => {
    expect(createEmptyDeckSlots()).toEqual([[], [], [], [], []]);
  });

  it('checks unlock state by slot index', () => {
    expect(isDeckSlotUnlocked(0, 1)).toBe(true);
    expect(isDeckSlotUnlocked(1, 1)).toBe(false);
    expect(isDeckSlotUnlocked(2, 3)).toBe(true);
  });

  it('updates a single deck slot', () => {
    const decks = createEmptyDeckSlots();
    const next = updateDeckAtIndex(decks, 1, [{ id: 'a' } as never]);
    expect(next[1]).toHaveLength(1);
    expect(next[0]).toEqual([]);
  });

  it('clamps unlocked count between 1 and 5', () => {
    expect(clampUnlockedDeckCount(0)).toBe(1);
    expect(clampUnlockedDeckCount(3)).toBe(3);
    expect(clampUnlockedDeckCount(99)).toBe(5);
  });

  it('normalizes partial deck arrays to five slots', () => {
    expect(normalizeDeckSlots([[{ id: 'x' } as never]])).toEqual([
      [{ id: 'x' }],
      [],
      [],
      [],
      [],
    ]);
  });
});
