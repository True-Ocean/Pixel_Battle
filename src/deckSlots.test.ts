import { describe, expect, it } from 'vitest';
import type { Card } from './types';
import {
  clampUnlockedDeckCount,
  countDeckCards,
  createEmptyDeckSlots,
  getBattleReadyDeckIndices,
  isDeckSlotUnlocked,
  moveCardBetweenDeckSlots,
  moveCardInLayout,
  normalizeDeckLayout,
  normalizeDeckSlots,
  resolveBattleHubDeckSelection,
  updateDeckAtIndex,
} from './deckSlots';

function card(id: string): Card {
  return {
    id,
    name: id,
    pixels: [[null]],
    canvasSize: 1,
    attribute: 'attack',
    bp: 10,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    rarity: 'N',
    stars: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('deckSlots', () => {
  it('creates five empty deck slots', () => {
    expect(createEmptyDeckSlots()).toEqual([
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
    ]);
  });

  it('checks unlock state by slot index', () => {
    expect(isDeckSlotUnlocked(0, 1)).toBe(true);
    expect(isDeckSlotUnlocked(1, 1)).toBe(false);
    expect(isDeckSlotUnlocked(2, 3)).toBe(true);
  });

  it('updates a single deck slot', () => {
    const decks = createEmptyDeckSlots();
    const next = updateDeckAtIndex(decks, 1, [card('a'), null, null, null, null]);
    expect(next[1][0]?.id).toBe('a');
    expect(next[0]).toEqual([null, null, null, null, null]);
  });

  it('clamps unlocked count between 1 and 5', () => {
    expect(clampUnlockedDeckCount(0)).toBe(1);
    expect(clampUnlockedDeckCount(3)).toBe(3);
    expect(clampUnlockedDeckCount(99)).toBe(5);
  });

  it('normalizes dense decks to top-aligned layout', () => {
    expect(normalizeDeckLayout([card('x')])).toEqual([
      card('x'),
      null,
      null,
      null,
      null,
    ]);
  });

  it('preserves sparse deck layout', () => {
    expect(
      normalizeDeckLayout([null, null, card('x'), null, null]),
    ).toEqual([null, null, card('x'), null, null]);
  });

  it('counts cards in layout', () => {
    expect(countDeckCards([card('a'), null, card('b'), null, null])).toBe(2);
  });

  it('moves a card to an empty slot in another deck', () => {
    const decks = createEmptyDeckSlots();
    decks[0] = [card('a'), card('b'), null, null, null];
    decks[1] = [null, null, null, null, null];

    const next = moveCardBetweenDeckSlots(decks, 0, 0, 1, 3);

    expect(next?.[0].map((item) => item?.id ?? null)).toEqual([
      null,
      'b',
      null,
      null,
      null,
    ]);
    expect(next?.[1].map((item) => item?.id ?? null)).toEqual([
      null,
      null,
      null,
      'a',
      null,
    ]);
  });

  it('inserts at the chosen slot when the target deck has room', () => {
    const decks = createEmptyDeckSlots();
    decks[0] = [card('a'), card('b'), null, null, null];
    decks[1] = [card('c'), null, card('d'), null, null];

    const next = moveCardBetweenDeckSlots(decks, 0, 0, 1, 1);

    expect(next?.[1].map((item) => item?.id ?? null)).toEqual([
      'c',
      'a',
      'd',
      null,
      null,
    ]);
  });

  it('places on an occupied slot by moving the displaced card to an empty slot', () => {
    const decks = createEmptyDeckSlots();
    decks[0] = [card('a'), card('b'), null, null, null];
    decks[1] = [card('c'), null, card('d'), null, null];

    const next = moveCardBetweenDeckSlots(decks, 0, 0, 1, 2);

    expect(next?.[0].map((item) => item?.id ?? null)).toEqual([
      null,
      'b',
      null,
      null,
      null,
    ]);
    expect(next?.[1].map((item) => item?.id ?? null)).toEqual([
      'c',
      'd',
      'a',
      null,
      null,
    ]);
  });

  it('swaps with the card at the chosen slot when the target deck is full', () => {
    const decks = createEmptyDeckSlots();
    decks[0] = [card('a'), card('b'), null, null, null];
    decks[1] = [card('d'), card('e'), card('f'), card('g'), card('h')];

    const next = moveCardBetweenDeckSlots(decks, 0, 1, 1, 0);

    expect(next?.[0].map((item) => item?.id ?? null)).toEqual([
      'a',
      'd',
      null,
      null,
      null,
    ]);
    expect(next?.[1].map((item) => item?.id ?? null)).toEqual([
      'b',
      'e',
      'f',
      'g',
      'h',
    ]);
  });

  it('moves within layout to an empty slot', () => {
    const layout = [card('a'), null, card('b'), null, null];
    expect(moveCardInLayout(layout, 0, 3).map((c) => c?.id ?? null)).toEqual([
      null,
      null,
      'b',
      'a',
      null,
    ]);
  });

  it('returns null for invalid moves', () => {
    const decks = createEmptyDeckSlots();
    decks[0] = [card('a'), null, null, null, null];
    expect(moveCardBetweenDeckSlots(decks, 0, 0, 0, 0)).toBeNull();
    expect(moveCardBetweenDeckSlots(decks, 0, 3, 1, 0)).toBeNull();
  });

  it('normalizes partial deck arrays to five slots', () => {
    expect(normalizeDeckSlots([[card('x')]])).toEqual([
      [card('x'), null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
    ]);
  });

  it('lists battle-ready deck indices among unlocked slots', () => {
    const decks = createEmptyDeckSlots();
    decks[0] = [card('a'), card('b'), card('c'), card('d'), card('e')];
    decks[1] = [card('f'), null, null, null, null];
    decks[2] = [card('g'), card('h'), card('i'), card('j'), card('k')];

    expect(getBattleReadyDeckIndices(decks, 1)).toEqual([0]);
    expect(getBattleReadyDeckIndices(decks, 3)).toEqual([0, 2]);
  });

  it('resolves hub deck selection from ready indices and last battle deck', () => {
    expect(resolveBattleHubDeckSelection([], 0)).toBeNull();
    expect(resolveBattleHubDeckSelection([2], 0)).toBe(2);
    expect(resolveBattleHubDeckSelection([0, 2], 2)).toBe(2);
    expect(resolveBattleHubDeckSelection([0, 2], 1)).toBeNull();
  });
});
