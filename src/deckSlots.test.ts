import { describe, expect, it } from 'vitest';
import type { Card } from './types';
import {
  canUnlockDeckSlotWithJewels,
  clampUnlockedDeckCount,
  countDeckCards,
  createEmptyDeckSlots,
  deckHasLostCard,
  findFirstEmptySlotInLayout,
  getBattleReadyDeckIndices,
  getDeckDisplayName,
  getDeckTabShortLabel,
  getDeckUnlockModalContent,
  isDeckNameTakenByOtherDeck,
  isDeckSlotUnlocked,
  resolveDeckUnlockOnLevelUp,
  isDeckBattleReady,
  moveCardBetweenDeckSlots,
  moveCardBetweenDeckSlotsSwap,
  moveCardInLayout,
  normalizeDeckLayout,
  normalizeDeckNames,
  normalizeDeckSlots,
  resolveBattleHubDeckSelection,
  setDeckNameAt,
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

describe('deck display names', () => {
  it('returns default label when name is unset', () => {
    expect(getDeckDisplayName(0)).toBe('デッキ1');
    expect(getDeckTabShortLabel(2)).toBe('3');
  });

  it('uses custom name when set', () => {
    const names = ['攻撃', '', '守備'];
    expect(getDeckDisplayName(0, names)).toBe('攻撃');
    expect(getDeckDisplayName(1, names)).toBe('デッキ2');
    expect(getDeckTabShortLabel(0, names)).toBe('攻撃');
    expect(getDeckTabShortLabel(2, names)).toBe('守備');
  });

  it('returns full custom name for tab label', () => {
    expect(getDeckTabShortLabel(0, ['おちゃらけ'])).toBe('おちゃらけ');
  });

  it('updates a single deck name', () => {
    expect(setDeckNameAt(undefined, 0, '攻撃')).toEqual(['攻撃', '', '', '', '']);
    expect(setDeckNameAt(['攻撃', '', '', '', ''], 0, '')).toBeUndefined();
    expect(setDeckNameAt(['攻撃', '守備', '', '', ''], 1, '  メイン  ')).toEqual([
      '攻撃',
      'メイン',
      '',
      '',
      '',
    ]);
  });

  it('normalizes deck names array', () => {
    expect(normalizeDeckNames([' 攻撃 ', '', '守備'])).toEqual(['攻撃', '', '守備']);
    expect(normalizeDeckNames(['', '   '])).toBeUndefined();
  });

  it('detects duplicate names among unlocked decks', () => {
    const names = ['攻撃', '守備', '', '', ''];
    expect(isDeckNameTakenByOtherDeck(names, 1, '攻撃', 2)).toBe(true);
    expect(isDeckNameTakenByOtherDeck(names, 1, '守備', 2)).toBe(false);
    expect(isDeckNameTakenByOtherDeck(names, 0, '攻撃', 2)).toBe(false);
    expect(isDeckNameTakenByOtherDeck(names, 1, '', 2)).toBe(false);
    expect(isDeckNameTakenByOtherDeck(names, 1, '  攻撃  ', 2)).toBe(true);
  });
});

describe('getDeckUnlockModalContent', () => {
  it('deck 4 requires deck 3 when skipping ahead', () => {
    const content = getDeckUnlockModalContent(3, 2, 15);
    expect(content.message).toBe('デッキ4はデッキ3解放後に解放できます。');
    expect(content.note).toBeUndefined();
    expect(content.showJewelCost).toBe(false);
  });

  it('deck 5 requires deck 4 when skipping ahead', () => {
    const content = getDeckUnlockModalContent(4, 3, 15);
    expect(content.message).toBe('デッキ5はデッキ4解放後に解放できます。');
    expect(content.note).toBeUndefined();
  });

  it('next unlock deck 4 shows jewel offer after deck 3', () => {
    const content = getDeckUnlockModalContent(3, 3, 15);
    expect(content.message).toBe('');
    expect(content.showJewelCost).toBe(false);
    expect(content.canUnlockWithJewels).toBe(true);
  });

  it('next unlock deck 3 uses minimal copy when ready', () => {
    const content = getDeckUnlockModalContent(2, 2, 15);
    expect(content.title).toBe('デッキ3 は未解放');
    expect(content.message).toBe('');
    expect(content.showJewelCost).toBe(false);
    expect(content.canUnlockWithJewels).toBe(true);
    expect(content.note).toBeUndefined();
  });

  it('deck 3 before level 10 uses sequential message', () => {
    const content = getDeckUnlockModalContent(2, 2, 5);
    expect(content.message).toBe('デッキ3はデッキ2解放後に解放できます。');
    expect(content.note).toBe(
      '現在 Lv.5 です。ユーザーレベル10到達後にジュエルで解放できます。',
    );
  });

  it('deck 3 when skipping ahead has no extra note', () => {
    const content = getDeckUnlockModalContent(2, 1, 15);
    expect(content.note).toBeUndefined();
  });

  it('deck 2 stays level 10 gated', () => {
    const content = getDeckUnlockModalContent(1, 1, 5);
    expect(content.title).toBe('デッキ2 は未解放');
    expect(content.message).toBe('デッキ2はユーザーレベル10到達で解放されます。');
    expect(content.note).toBe('現在 Lv.5 です。');
  });

  it('ignores custom deck names in unlock messages', () => {
    const content = getDeckUnlockModalContent(3, 2, 15);
    expect(content.message).toBe('デッキ4はデッキ3解放後に解放できます。');
    expect(content.message).not.toContain('メイン');
    expect(getDeckUnlockModalContent(2, 2, 15).message).toBe('');
  });
});

describe('canUnlockDeckSlotWithJewels', () => {
  it('allows deck 3 when level 10+ and sequential', () => {
    expect(canUnlockDeckSlotWithJewels(2, 2, 10)).toBe(true);
    expect(canUnlockDeckSlotWithJewels(2, 2, 15)).toBe(true);
  });

  it('rejects before level 10', () => {
    expect(canUnlockDeckSlotWithJewels(2, 2, 9)).toBe(false);
  });

  it('rejects skipping ahead or deck 2', () => {
    expect(canUnlockDeckSlotWithJewels(3, 2, 15)).toBe(false);
    expect(canUnlockDeckSlotWithJewels(1, 1, 15)).toBe(false);
  });

  it('rejects when all decks unlocked', () => {
    expect(canUnlockDeckSlotWithJewels(4, 5, 15)).toBe(false);
  });
});

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

  it('unlocks deck slot 2 when level 10 is reached', () => {
    expect(resolveDeckUnlockOnLevelUp(1, [9])).toBe(1);
    expect(resolveDeckUnlockOnLevelUp(1, [10])).toBe(2);
    expect(resolveDeckUnlockOnLevelUp(3, [10])).toBe(3);
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

  it('swap variant always exchanges cards on occupied target slots', () => {
    const decks = createEmptyDeckSlots();
    decks[0] = [card('a'), card('b'), null, null, null];
    decks[1] = [card('c'), null, card('d'), null, null];

    const next = moveCardBetweenDeckSlotsSwap(decks, 0, 0, 1, 2);

    expect(next?.[0].map((item) => item?.id ?? null)).toEqual([
      'd',
      'b',
      null,
      null,
      null,
    ]);
    expect(next?.[1].map((item) => item?.id ?? null)).toEqual([
      'c',
      null,
      'a',
      null,
      null,
    ]);
  });

  it('finds the first empty slot in a layout', () => {
    expect(findFirstEmptySlotInLayout([card('a'), null, card('b'), null, null])).toBe(1);
    expect(findFirstEmptySlotInLayout([card('a'), card('b'), card('c'), card('d'), card('e')])).toBe(-1);
  });

  it('swap variant moves to empty target slots without displacement', () => {
    const decks = createEmptyDeckSlots();
    decks[0] = [card('a'), card('b'), null, null, null];
    decks[1] = [card('c'), null, null, null, null];

    const next = moveCardBetweenDeckSlotsSwap(decks, 0, 0, 1, 1);

    expect(next?.[0].map((item) => item?.id ?? null)).toEqual([
      null,
      'b',
      null,
      null,
      null,
    ]);
    expect(next?.[1].map((item) => item?.id ?? null)).toEqual([
      'c',
      'a',
      null,
      null,
      null,
    ]);
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

  it('treats lost cards as not battle-ready', () => {
    const layout = [
      card('a'),
      card('b'),
      card('c'),
      card('d'),
      { ...card('e'), status: 'lost' as const },
    ];
    expect(isDeckBattleReady(layout)).toBe(false);
    expect(deckHasLostCard(layout)).toBe(true);
    expect(getBattleReadyDeckIndices([layout], 1)).toEqual([]);
  });
});
