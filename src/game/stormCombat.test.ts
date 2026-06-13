import { describe, expect, it } from 'vitest';
import type { BattleUnit } from '../types/battle';
import {
  calcStormDamage,
  canUseStormAction,
  pickStormTargets,
} from './stormCombat';

function unit(
  partial: Partial<BattleUnit> & Pick<BattleUnit, 'position'>,
): BattleUnit {
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
    stormUsesRemaining: 0,
    ninjaFirstStrikeUsed: false,
    rarity: 'N',
    stars: 0,
    ...partial,
  };
}

describe('stormCombat', () => {
  it('ダメージはcurrentBpの78%', () => {
    expect(calcStormDamage(80)).toBe(62);
    expect(calcStormDamage(100)).toBe(78);
  });

  it('残り回数がある嵐属性のみ嵐を選べる', () => {
    const storm = unit({
      position: 'backCenter',
      attribute: 'storm',
      stormUsesRemaining: 2,
    });
    const enemy = [unit({ position: 'frontLeft' })];
    expect(canUseStormAction(storm, enemy)).toBe(true);
    expect(
      canUseStormAction({ ...storm, stormUsesRemaining: 0 }, enemy),
    ).toBe(false);
  });

  it('ステルス中も嵐の対象になりうる', () => {
    const field = [
      unit({ position: 'frontLeft', stealthActive: true }),
      unit({ position: 'frontRight' }),
    ];
    expect(pickStormTargets(field, () => 0)).toHaveLength(2);
  });

  it('敵1体なら1体だけ選ぶ', () => {
    const field = [unit({ position: 'frontLeft' })];
    expect(pickStormTargets(field, () => 0)).toEqual(['frontLeft']);
  });
});
