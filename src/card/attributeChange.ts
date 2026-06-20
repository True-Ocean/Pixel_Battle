import { isAttributeUnlockedAtLevel } from '../config/attributeUnlock';
import type { Attribute, Card } from '../types';
import { recalculateCardBp } from './createCard';
import { rollAttribute } from './rollAttribute';

export function applyAttributeChange(
  card: Card,
  attribute: Attribute,
  userLevel: number,
  paletteShopUnlocks: readonly number[] = [],
): Card {
  const next: Card = { ...card, attribute };
  return {
    ...next,
    bp: recalculateCardBp(next, userLevel, paletteShopUnlocks),
  };
}

export function retouchCardAttribute(
  card: Card,
  userLevel: number,
  paletteShopUnlocks: readonly number[] = [],
  random: () => number = Math.random,
): Card {
  const attribute = rollAttribute(userLevel, random);
  return applyAttributeChange(card, attribute, userLevel, paletteShopUnlocks);
}

export function selectCardAttribute(
  card: Card,
  attribute: Attribute,
  userLevel: number,
  paletteShopUnlocks: readonly number[] = [],
): Card {
  if (!isAttributeUnlockedAtLevel(attribute, userLevel)) {
    throw new Error('未解放の属性です');
  }
  return applyAttributeChange(card, attribute, userLevel, paletteShopUnlocks);
}
