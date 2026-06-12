import { describe, expect, it } from 'vitest';
import type { BattleUnit } from '../types/battle';
import { applyFreeze, expireFreeze, getSelectionTurn, isFrozen } from './iceCombat';
import { createBattleState } from './battleState';

function unit(partial: Partial<BattleUnit> & Pick<BattleUnit, 'position'>): BattleUnit {
  return {
    cardId: 'id',
    name: 'U',
    attribute: 'attack',
    maxBp: 100,
    currentBp: 80,
    position: partial.position,
    defenseShieldUsed: false,
    hasShield: false,
    poisonStacks: [],
    poisonDotDamageReceived: false,
    frozenUntilTurn: null,
    stealthActive: false,
    healUsesRemaining: 0,
    bowArrowsRemaining: 0,
    stormUsed: false,
    ninjaFirstStrikeUsed: false,
    rarity: 'N',
    stars: 0,
    ...partial,
  };
}

describe('iceCombat', () => {
  it('凍結は次の次の選択ターンまで行動不能', () => {
    const target = unit({ position: 'frontLeft' });
    applyFreeze(target, 1);
    expect(target.frozenUntilTurn).toBe(3);
    expect(isFrozen(target, 2)).toBe(true);
    expect(isFrozen(target, 3)).toBe(true);
    expect(isFrozen(target, 4)).toBe(false);
  });

  it('表示ターン開始時に期限切れ凍結を解除する', () => {
    const target = unit({ position: 'frontLeft', frozenUntilTurn: 2 });
    expireFreeze([target], 3);
    expect(target.frozenUntilTurn).toBeNull();
  });

  it('getSelectionTurnはstate.turn+1', () => {
    const state = createBattleState([], []);
    state.turn = 4;
    expect(getSelectionTurn(state)).toBe(5);
  });
});
