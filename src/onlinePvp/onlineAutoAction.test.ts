import { describe, expect, it } from 'vitest';
import { createBattleState } from '../game/battleState';
import { pickRandomOnlineAction } from './onlineAutoAction';
import { enumerateBattleActionChoices } from '../game/actionChoices';
import type { Card } from '../types';

function stub(id: string): Card {
  return {
    id,
    name: id,
    attribute: 'attack',
    bp: 100,
    pixels: [],
    canvasSize: 16,
    rarity: 'N',
    stars: 0,
    wins: 0,
    losses: 0,
    reviveCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('pickRandomOnlineAction', () => {
  it('有効行動のいずれかを返す', () => {
    const state = createBattleState(
      [stub('a1'), stub('a2'), stub('a3'), stub('a4'), stub('a5')],
      [stub('b1'), stub('b2'), stub('b3'), stub('b4'), stub('b5')],
    );
    const candidates = enumerateBattleActionChoices(state, 'player');
    const choice = pickRandomOnlineAction(state, 'player', () => 0);
    expect(candidates).toContainEqual(choice);
  });
});
