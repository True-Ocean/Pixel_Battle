import { describe, expect, it } from 'vitest';
import {
  calcDualSecondaryDamage,
  getDualSecondaryPosition,
  getDualSecondaryTarget,
} from './dualCombat';

describe('dualCombat', () => {
  it('副攻撃は50%', () => {
    expect(calcDualSecondaryDamage(80)).toBe(40);
  });

  it('主対象の反対側前衛を副対象にする', () => {
    expect(getDualSecondaryPosition('frontLeft')).toBe('frontRight');
    expect(getDualSecondaryPosition('frontRight')).toBe('frontLeft');
  });

  it('副対象がいなければ null', () => {
    const enemy = [
      {
        cardId: 'c1',
        name: '敵',
        attribute: 'attack' as const,
        maxBp: 80,
        currentBp: 80,
        position: 'frontRight' as const,
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
        rarity: 'N' as const,
        stars: 0 as const,
      },
    ];
    expect(getDualSecondaryTarget('frontRight', enemy)).toBeNull();
  });
});
