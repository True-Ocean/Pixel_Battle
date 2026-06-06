import { ATTRIBUTE_POWER } from '../config/balance';
import type { Attribute, Card } from '../types';

/** 1枚の戦力 = round(HP × hpWeight + flatBonus) */
export function computeCardPower(card: Pick<Card, 'attribute' | 'hp'>): number {
  const config = ATTRIBUTE_POWER[card.attribute];
  return Math.round(card.hp * config.hpWeight + config.flatBonus);
}

/** デッキ戦力 = 5枚（または所持枚数）のカード戦力合計 */
export function computeDeckPower(deck: readonly Pick<Card, 'attribute' | 'hp'>[]): number {
  return deck.reduce((sum, card) => sum + computeCardPower(card), 0);
}

export function attributePowerConfig(attribute: Attribute) {
  return ATTRIBUTE_POWER[attribute];
}
