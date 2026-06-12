import { POISON_DOT_RATIO } from '../config/balance';
import type { BattleUnit, PoisonStack } from '../types/battle';

export function calcPoisonDotDamage(sourceCurrentBp: number): number {
  return Math.round(sourceCurrentBp * POISON_DOT_RATIO);
}

export function createPoisonStack(
  attacker: BattleUnit,
  sourceCurrentBp: number = attacker.currentBp,
): PoisonStack {
  return {
    sourceCardId: attacker.cardId,
    damagePerTurn: calcPoisonDotDamage(sourceCurrentBp),
  };
}

/** 近接した毒属性が主対象へスタックを付与（ATTRIBUTE_SPEC §4.6） */
export function grantPoisonStack(
  target: BattleUnit,
  attacker: BattleUnit,
  sourceCurrentBp: number = attacker.currentBp,
): void {
  if (attacker.attribute !== 'poison') return;
  if (target.poisonStacks.length === 0) {
    target.poisonDotDamageReceived = false;
  }
  target.poisonStacks.push(createPoisonStack(attacker, sourceCurrentBp));
}

export function sumPoisonDotDamage(stacks: readonly PoisonStack[]): number {
  return stacks.reduce((sum, stack) => sum + stack.damagePerTurn, 0);
}
