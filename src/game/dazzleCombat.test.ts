import { describe, expect, it } from 'vitest';
import type { BattleUnit } from '../types/battle';
import { applyDazzle, clearDazzle, expireDazzle, isDazzled } from './dazzleCombat';

function unit(partial: Partial<BattleUnit> & Pick<BattleUnit, 'position'>): BattleUnit {
  return {
    cardId: 'id',
    name: 'U',
    attribute: 'attack',
    maxBp: 100,
    currentBp: 100,
    defenseShieldUsed: false,
    hasShield: false,
    poisonStacks: [],
    poisonDotDamageReceived: false,
    frozenUntilTurn: null,
    stealthActive: false,
    healUsesRemaining: 0,
    bowArrowsRemaining: 0,
    stormUsesRemaining: 0,
    illuminateUsesRemaining: 0,
    dazzledUntilTurn: null,
    ninjaFirstStrikeUsed: false,
    illuminatedNinjaCardIds: [],
    rarity: 'N',
    stars: 0,
    ...partial,
  };
}

describe('dazzleCombat', () => {
  it('目眩でBPとmaxBpが0.8倍になる', () => {
    const target = unit({ position: 'frontLeft' });
    expect(applyDazzle(target, 1)).toBe(true);
    expect(target.currentBp).toBe(80);
    expect(target.maxBp).toBe(80);
    expect(target.dazzledUntilTurn).toBe(2);
    expect(isDazzled(target)).toBe(true);
  });

  it('既に目眩中なら再乗算せず期限だけ延長する', () => {
    const target = unit({ position: 'frontLeft' });
    applyDazzle(target, 1);
    expect(applyDazzle(target, 2)).toBe(false);
    expect(target.currentBp).toBe(80);
    expect(target.dazzledUntilTurn).toBe(3);
  });

  it('解除時は残BPを0.8で割り戻す', () => {
    const target = unit({ position: 'frontLeft' });
    applyDazzle(target, 1);
    target.currentBp = 24;
    clearDazzle(target);
    expect(target.currentBp).toBe(30);
    expect(target.maxBp).toBe(100);
    expect(target.dazzledUntilTurn).toBeNull();
  });

  it('表示ターンが期限を超えたら自然解除する', () => {
    const target = unit({
      position: 'frontLeft',
      currentBp: 80,
      maxBp: 80,
      dazzledUntilTurn: 2,
    });
    expireDazzle([target], 3);
    expect(target.dazzledUntilTurn).toBeNull();
    expect(target.currentBp).toBe(100);
    expect(target.maxBp).toBe(100);
  });
});
