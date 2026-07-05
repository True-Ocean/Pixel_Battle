import { describe, expect, it } from 'vitest';
import { createBattleState } from '../game/battleState';
import type { Card } from '../types';
import {
  flipBattleStateForGuest,
  toLocalBattleState,
} from './battleSync';
import { nextPhaseAfterClash, onlinePromotionNeeded } from './onlineBattleAuthority';

function stub(id: string, bp = 100): Card {
  return {
    id,
    name: id,
    attribute: 'attack',
    bp,
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

describe('battleSync perspective helpers', () => {
  it('flipBattleStateForGuest は player/cpu を入れ替える', () => {
    const cards = [stub('a'), stub('b'), stub('c'), stub('d'), stub('e')];
    const cpu = [stub('c1'), stub('c2'), stub('c3'), stub('c4'), stub('c5')];
    const host = createBattleState(cards, cpu);
    const guest = flipBattleStateForGuest(host);
    expect(guest.player[0]!.cardId).toBe(host.cpu[0]!.cardId);
    expect(guest.cpu[0]!.cardId).toBe(host.player[0]!.cardId);
  });

  it('toLocalBattleState はゲストのみ flip する', () => {
    const cards = [stub('a'), stub('b'), stub('c'), stub('d'), stub('e')];
    const cpu = [stub('c1'), stub('c2'), stub('c3'), stub('c4'), stub('c5')];
    const host = createBattleState(cards, cpu);
    expect(toLocalBattleState(host, 'host')).toBe(host);
    expect(toLocalBattleState(host, 'guest').player[0]!.cardId).toBe(
      host.cpu[0]!.cardId,
    );
  });
});

describe('onlineBattleAuthority', () => {
  it('前衛欠けがなければ promotion 不要', () => {
    const cards = [stub('a'), stub('b'), stub('c'), stub('d'), stub('e')];
    const cpu = [stub('c1'), stub('c2'), stub('c3'), stub('c4'), stub('c5')];
    const state = createBattleState(cards, cpu);
    expect(onlinePromotionNeeded(state)).toBe(false);
    expect(nextPhaseAfterClash(state)).toBe('turn_start');
  });

  it('前衛欠けがあれば promotion フェーズへ', () => {
    const cards = [stub('a'), stub('b'), stub('c'), stub('d'), stub('e')];
    const cpu = [stub('c1'), stub('c2'), stub('c3'), stub('c4'), stub('c5')];
    const state = createBattleState(cards, cpu);
    state.player[0]!.position = 'defeated';
    state.player[0]!.currentBp = 0;
    expect(onlinePromotionNeeded(state)).toBe(true);
    expect(nextPhaseAfterClash(state)).toBe('promotion');
  });
});
