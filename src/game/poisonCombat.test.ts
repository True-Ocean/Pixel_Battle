import { describe, expect, it } from 'vitest';
import {
  calcPoisonDotDamage,
  createPoisonStack,
  grantPoisonStack,
  sumPoisonDotDamage,
} from './poisonCombat';

describe('poisonCombat', () => {
  it('DoTは付与時currentBpの30%', () => {
    expect(calcPoisonDotDamage(80)).toBe(24);
    expect(calcPoisonDotDamage(100)).toBe(30);
  });

  it('毒属性の近接でスタックを付与する', () => {
    const attacker = {
      cardId: 'poison-1',
      attribute: 'poison' as const,
      maxBp: 80,
      currentBp: 80,
    };
    const target = { poisonStacks: [] as ReturnType<typeof createPoisonStack>[] };
    grantPoisonStack(target as never, attacker as never);
    expect(target.poisonStacks).toHaveLength(1);
    expect(target.poisonStacks[0]!.damagePerTurn).toBe(24);
    expect(target.poisonStacks[0]!.sourceCardId).toBe('poison-1');
  });

  it('スタックの毒ダメージを合算する', () => {
    const stacks = [
      { sourceCardId: 'a', damagePerTurn: 16 },
      { sourceCardId: 'a', damagePerTurn: 20 },
    ];
    expect(sumPoisonDotDamage(stacks)).toBe(36);
  });
});
