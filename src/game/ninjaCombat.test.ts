import { describe, expect, it } from 'vitest';
import type { BattleUnit } from '../types/battle';
import {
  breakStealth,
  isMeleeTargetable,
  isStealthed,
  onExternalEffectToUnit,
  onNinjaMeleeAttack,
  shouldApplyNinjaFirstStrike,
  shouldStartInStealth,
} from './ninjaCombat';

function unit(overrides: Partial<BattleUnit> = {}): BattleUnit {
  return {
    cardId: 'n1',
    name: '忍',
    attribute: 'ninja',
    maxBp: 80,
    currentBp: 80,
    position: 'backCenter',
    defenseShieldUsed: false,
    hasShield: false,
    poisonStacks: [],
    poisonDotDamageReceived: false,
    frozenUntilTurn: null,
    stealthActive: true,
    healUsesRemaining: 0,
    bowArrowsRemaining: 0,
    stormUsesRemaining: 0,
    ninjaFirstStrikeUsed: false,
    illuminatedNinjaCardIds: [],
    rarity: 'N',
    stars: 0,
    ...overrides,
  };
}

describe('ninjaCombat', () => {
  it('忍は配置に関わらず戦闘開始時ステルス', () => {
    expect(shouldStartInStealth('ninja')).toBe(true);
    expect(shouldStartInStealth('attack')).toBe(false);
  });

  it('ステルス中は近接対象にならない', () => {
    expect(isMeleeTargetable(unit())).toBe(false);
    expect(isMeleeTargetable(unit({ stealthActive: false }))).toBe(true);
  });

  it('初回無反撃は一方的近接のみ', () => {
    const ninja = unit({ position: 'frontLeft', stealthActive: false });
    expect(shouldApplyNinjaFirstStrike(ninja, false)).toBe(true);
    expect(shouldApplyNinjaFirstStrike(ninja, true)).toBe(false);
    onNinjaMeleeAttack(ninja);
    expect(shouldApplyNinjaFirstStrike(ninja, false)).toBe(false);
  });

  it('近接攻撃でステルス解除', () => {
    const ninja = unit({ position: 'frontLeft' });
    onNinjaMeleeAttack(ninja);
    expect(isStealthed(ninja)).toBe(false);
    expect(ninja.ninjaFirstStrikeUsed).toBe(true);
  });

  it('breakStealth は冪等', () => {
    const ninja = unit();
    breakStealth(ninja);
    breakStealth(ninja);
    expect(ninja.stealthActive).toBe(false);
  });

  it('外部効果でステルス解除すると初回無反撃の権利も失う', () => {
    const ninja = unit();
    onExternalEffectToUnit(ninja);
    expect(ninja.stealthActive).toBe(false);
    expect(ninja.ninjaFirstStrikeUsed).toBe(true);
    expect(shouldApplyNinjaFirstStrike(ninja, false)).toBe(false);
  });
});
