import { describe, expect, it } from 'vitest';
import {
  calcHealAmount,
  canReceiveHeal,
  getHealSelectionHint,
  getHealTargets,
  healTargetsIncludeDebuff,
} from './healCombat';
import type { BattleUnit } from '../types/battle';

const SELECTION_TURN = 2;

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
  it('満タンは回復対象外（デバフなし）', () => {
    expect(
      canReceiveHeal(unit({ position: 'frontLeft', currentBp: 100 }), SELECTION_TURN),
    ).toBe(false);
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
        SELECTION_TURN,
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
        SELECTION_TURN,
      ),
    ).toBe(true);
  });

  it('凍結中は満タンでも回復対象（凍結解消可）', () => {
    expect(
      canReceiveHeal(
        unit({
          position: 'frontLeft',
          currentBp: 100,
          frozenUntilTurn: 2,
        }),
        SELECTION_TURN,
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
    expect(getHealTargets(field, 'backCenter', SELECTION_TURN)).toEqual(['frontLeft']);
    const selfHealField = [
      unit({ position: 'backCenter', healUsesRemaining: 1, currentBp: 70 }),
      unit({ position: 'frontLeft', currentBp: 100 }),
    ];
    expect(getHealTargets(selfHealField, 'backCenter', SELECTION_TURN)).toEqual([
      'backCenter',
    ]);
  });

  it('回復対象にデバフ持ちがいるか判定する', () => {
    const debuffField = [
      unit({ position: 'backCenter' }),
      unit({
        position: 'frontLeft',
        currentBp: 100,
        frozenUntilTurn: 2,
      }),
    ];
    const bpOnlyField = [
      unit({ position: 'backCenter' }),
      unit({ position: 'frontLeft', currentBp: 40 }),
    ];
    expect(
      healTargetsIncludeDebuff(debuffField, 'backCenter', SELECTION_TURN),
    ).toBe(true);
    expect(
      healTargetsIncludeDebuff(bpOnlyField, 'backCenter', SELECTION_TURN),
    ).toBe(false);
  });

  it('癒の中央ガイド文言をデバフ有無と前衛で切り替える', () => {
    const debuffField = [
      unit({ position: 'backCenter' }),
      unit({
        position: 'frontLeft',
        currentBp: 100,
        poisonStacks: [{ sourceCardId: 'p1', damagePerTurn: 10 }],
        poisonDotDamageReceived: true,
      }),
    ];
    const bpOnlyField = [
      unit({ position: 'backCenter' }),
      unit({ position: 'frontLeft', currentBp: 40 }),
    ];
    expect(
      getHealSelectionHint(debuffField, 'backCenter', SELECTION_TURN, false),
    ).toBe('治癒・回復先を選択');
    expect(
      getHealSelectionHint(bpOnlyField, 'backCenter', SELECTION_TURN, false),
    ).toBe('回復先を選択');
    expect(
      getHealSelectionHint(debuffField, 'backCenter', SELECTION_TURN, true),
    ).toBe('攻撃先か治癒・回復先を選択');
    const frontHealerField = [
      unit({ position: 'frontLeft', healUsesRemaining: 2 }),
      unit({ position: 'frontRight', currentBp: 40 }),
    ];
    expect(
      getHealSelectionHint(frontHealerField, 'frontLeft', SELECTION_TURN, true),
    ).toBe('攻撃先か回復先を選択');
  });
});
