import {
  ATTACK_POWER_WEIGHT_BY_RARITY,
  ATTRIBUTE_POWER_WEIGHT,
} from '../config/balance';
import type { Attribute, Card, CardRarity } from '../types';

/** 属性・レアに応じた戦力係数（正規化済み） */
export function getCardPowerWeight(
  attribute: Attribute,
  rarity: CardRarity = 'N',
): number {
  if (attribute === 'attack') {
    return ATTACK_POWER_WEIGHT_BY_RARITY[rarity];
  }
  return ATTRIBUTE_POWER_WEIGHT[attribute];
}

/** 1枚の戦力 = round(BP × bpWeight)。剣はレアで係数分岐 */
export function computeCardPower(
  card: Pick<Card, 'attribute' | 'bp'> & { rarity?: CardRarity },
): number {
  const weight = getCardPowerWeight(card.attribute, card.rarity ?? 'N');
  return Math.round(card.bp * weight);
}

/** デッキ戦力 = 各カード戦力の合計 */
export function computeDeckPower(
  deck: readonly (Pick<Card, 'attribute' | 'bp'> & { rarity?: CardRarity })[],
): number {
  return deck.reduce((sum, card) => sum + computeCardPower(card), 0);
}

/** @deprecated {@link getCardPowerWeight} を推奨 */
export function attributePowerConfig(attribute: Attribute) {
  return { bpWeight: ATTRIBUTE_POWER_WEIGHT[attribute] };
}
