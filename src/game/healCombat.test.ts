import { describe, expect, it } from 'vitest';
import {
  calcHealAmount,
  canReceiveHeal,
  getHealTargets,
} from './healCombat';
import type { BattleUnit } from '../types/battle';

function unit(partial: Partial<BattleUnit> & Pick<BattleUnit, 'position'>): BattleUnit {
  return {
    cardId: 'id',
    name: 'U',
    attribute: 'heal',
    maxBp: 100,
    currentBp: 80,
    position: partial.position,
    defenseShieldUsed: false,
    hasShield: false,
    poisonStacks: [],
    poisonDotDamageReceived: false,
    frozenUntilTurn: null,
    stealthActive: false,
    healUsesRemaining: 2,
    bowArrowsRemaining: 0,
    stormUsesRemaining: 0,
    ninjaFirstStrikeUsed: false,
    rarity: 'N',
    stars: 0,
    ...partial,
  };
}

describe('healCombat', () => {
  it('満タンは回復対象外（毒なし）', () => {
    expect(canReceiveHeal(unit({ position: 'frontLeft', currentBp: 100 }))).toBe(
      false,
    );
  });

  it('毒付与直後は回復対象外', () => {
    expect(
      canReceiveHeal(
        unit({
          position: 'frontLeft',
          currentBp: 70,
          poisonStacks: [{ sourceCardId: 'p1', damagePerTurn: 10 }],
          poisonDotDamageReceived: false,
        }),
      ),
    ).toBe(false);
  });

  it('毒ダメージ後は回復対象（毒解消可）', () => {
    expect(
      canReceiveHeal(
        unit({
          position: 'frontLeft',
          currentBp: 100,
          poisonStacks: [{ sourceCardId: 'p1', damagePerTurn: 10 }],
          poisonDotDamageReceived: true,
        }),
      ),
    ).toBe(true);
  });

  it('回復量はhealerのcurrentBpと欠損分の小さい方', () => {
    const healer = unit({ position: 'backCenter', currentBp: 60 });
    const target = unit({ position: 'frontLeft', currentBp: 70, maxBp: 100 });
    expect(calcHealAmount(healer, target)).toBe(30);
    expect(calcHealAmount(healer, unit({ position: 'frontRight', currentBp: 50 }))).toBe(
      50,
    );
  });

  it('回復対象一覧にダメージを受けた味方を含む', () => {
    const field = [
      unit({ position: 'backCenter', healUsesRemaining: 1, currentBp: 100 }),
      unit({ position: 'frontLeft', currentBp: 40 }),
      unit({ position: 'frontRight', currentBp: 100 }),
    ];
    expect(getHealTargets(field, 'backCenter')).toEqual(['frontLeft']);
    const selfHealField = [
      unit({ position: 'backCenter', healUsesRemaining: 1, currentBp: 70 }),
      unit({ position: 'frontLeft', currentBp: 100 }),
    ];
    expect(getHealTargets(selfHealField, 'backCenter')).toEqual(['backCenter']);
  });
});
