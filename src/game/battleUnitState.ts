import type { Card } from '../types';
import type { BattleUnit, PoisonStack } from '../types/battle';

/** 新規 BattleUnit の拡張状態（ATTRIBUTE_SPEC §5） */
export function createExtendedBattleUnitState(
  card: Card,
): Pick<
  BattleUnit,
  | 'defenseShieldUsed'
  | 'hasShield'
  | 'poisonStacks'
  | 'frozenUntilTurn'
  | 'stealthActive'
  | 'healUsesRemaining'
  | 'stormUsed'
  | 'ninjaFirstStrikeUsed'
  | 'rarity'
  | 'stars'
> {
  return {
    defenseShieldUsed: false,
    hasShield: card.attribute === 'defense',
    poisonStacks: [] as PoisonStack[],
    frozenUntilTurn: null,
    stealthActive: false,
    healUsesRemaining: card.attribute === 'heal' ? 2 : 0,
    stormUsed: false,
    ninjaFirstStrikeUsed: false,
    rarity: card.rarity,
    stars: card.stars,
  };
}

export function clonePoisonStacks(stacks: PoisonStack[]): PoisonStack[] {
  return stacks.map((s) => ({ ...s }));
}
