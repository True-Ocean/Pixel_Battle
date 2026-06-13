import { describe, expect, it } from 'vitest';
import { createEmptyDeckSlots } from '../deckSlots';
import type { Card, SaveData } from '../types';
import { resetBattleRecords } from './index';

function makeCard(id: string): Card {
  return {
    id,
    name: id,
    pixels: [[null]],
    canvasSize: 1,
    attribute: 'attack',
    bp: 10,
    wins: 4,
    losses: 2,
    reviveCount: 1,
    rarity: 'N',
    stars: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('resetBattleRecords', () => {
  it('resets user level and card records while keeping deck content', () => {
    const decks = createEmptyDeckSlots();
    decks[0] = [makeCard('a'), makeCard('b')];

    const save: SaveData = {
      user: {
        username: 'test',
        level: 5,
        exp: 99,
        battleWins: 10,
        battleLosses: 3,
      },
      decks,
      activeDeckIndex: 0,
      unlockedDeckCount: 1,
    };

    expect(resetBattleRecords(save)).toEqual({
      user: {
        username: 'test',
        level: 1,
        exp: 0,
        battleWins: 0,
        battleLosses: 0,
      },
      decks: [[
        { ...makeCard('a'), wins: 0, losses: 0 },
        { ...makeCard('b'), wins: 0, losses: 0 },
      ], [], [], [], []],
      activeDeckIndex: 0,
      unlockedDeckCount: 1,
      battleHistory: [],
    });
  });
});
