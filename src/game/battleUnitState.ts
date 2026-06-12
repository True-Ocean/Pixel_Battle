import type { Card } from '../types';
import { BOW_ARROWS_PER_BATTLE, STORM_USES_PER_BATTLE } from '../config/balance';
import type { BattleUnit, PoisonStack } from '../types/battle';

/** 新規 BattleUnit の拡張状態（ATTRIBUTE_SPEC §5） */
export function createExtendedBattleUnitState(
  card: Card,
): Pick<
  BattleUnit,
  | 'defenseShieldUsed'
  | 'hasShield'
  | 'poisonStacks'
  | 'poisonDotDamageReceived'
  | 'frozenUntilTurn'
  | 'stealthActive'
  | 'healUsesRemaining'
  | 'bowArrowsRemaining'
  | 'stormUsesRemaining'
  | 'ninjaFirstStrikeUsed'
  | 'rarity'
  | 'stars'
> {
  return {
    defenseShieldUsed: false,
    hasShield: card.attribute === 'defense',
    poisonStacks: [] as PoisonStack[],
    poisonDotDamageReceived: false,
    frozenUntilTurn: null,
    stealthActive: false, // cardToBattleUnit で忍のみ true に上書き
    healUsesRemaining: card.attribute === 'heal' ? 2 : 0,
    bowArrowsRemaining:
      card.attribute === 'bow' ? BOW_ARROWS_PER_BATTLE : 0,
    stormUsesRemaining:
      card.attribute === 'storm' ? STORM_USES_PER_BATTLE : 0,
    ninjaFirstStrikeUsed: false,
    rarity: card.rarity,
    stars: card.stars,
  };
}

export function clonePoisonStacks(stacks: PoisonStack[]): PoisonStack[] {
  return stacks.map((s) => ({ ...s }));
}
