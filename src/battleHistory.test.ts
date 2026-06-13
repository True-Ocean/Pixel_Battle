import { describe, expect, it } from 'vitest';
import type { BattleHistoryEntry, Card } from './types';
import { appendBattleHistory, BATTLE_HISTORY_MAX } from './battleHistory';

function makeEntry(id: string): BattleHistoryEntry {
  const card: Card = {
    id: 'c1',
    name: 'test',
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
  return {
    id,
    playedAt: '2026-01-01T00:00:00.000Z',
    winner: 'player',
    opponentName: 'CPU',
    opponentLevel: 1,
    opponentDeckPower: 100,
    playerDeckPower: 120,
    opponentDeck: [card],
  };
}

describe('appendBattleHistory', () => {
  it('prepends entry and keeps max length', () => {
    const history = Array.from({ length: BATTLE_HISTORY_MAX }, (_, i) =>
      makeEntry(`old-${i}`),
    );
    const next = appendBattleHistory(history, makeEntry('new'));
    expect(next).toHaveLength(BATTLE_HISTORY_MAX);
    expect(next[0]?.id).toBe('new');
    expect(next[BATTLE_HISTORY_MAX - 1]?.id).toBe(`old-${BATTLE_HISTORY_MAX - 2}`);
  });
});
