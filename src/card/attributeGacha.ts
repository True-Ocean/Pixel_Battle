import {
  JEWEL_COST_ATTRIBUTE_EVENT_GACHA,
  JEWEL_COST_ATTRIBUTE_SELECT,
  PIXEL_COST_ATTRIBUTE_GACHA_10,
  PIXEL_COST_ATTRIBUTE_GACHA_5,
  PIXEL_COST_ATTRIBUTE_RETOUCH,
} from '../config/economy';
import type { Attribute, Card } from '../types';
import { applyAttributeChange } from './attributeChange';
import { rollAttribute } from './rollAttribute';

export type AttributeGachaPulls = 1 | 5 | 10;

export type AttributeGachaMode =
  | 'single'
  | 'multi5'
  | 'multi10'
  | 'confirm'
  | 'event';

export function getAttributeGachaPulls(mode: AttributeGachaMode): AttributeGachaPulls | null {
  if (mode === 'single' || mode === 'event') return 1;
  if (mode === 'multi5') return 5;
  if (mode === 'multi10') return 10;
  return null;
}

export function getAttributeGachaPixelCost(pulls: AttributeGachaPulls): number {
  if (pulls === 1) return PIXEL_COST_ATTRIBUTE_RETOUCH;
  if (pulls === 5) return PIXEL_COST_ATTRIBUTE_GACHA_5;
  return PIXEL_COST_ATTRIBUTE_GACHA_10;
}

export function getAttributeGachaJewelCost(): number {
  return JEWEL_COST_ATTRIBUTE_SELECT;
}

export function getAttributeEventGachaJewelCost(): number {
  return JEWEL_COST_ATTRIBUTE_EVENT_GACHA;
}

export function canAffordAttributeGachaPixels(
  economy: { freePixels: number },
  pulls: AttributeGachaPulls,
): boolean {
  return economy.freePixels >= getAttributeGachaPixelCost(pulls);
}

export function canAffordAttributeGachaConfirm(economy: {
  jewels: number;
}): boolean {
  return economy.jewels >= JEWEL_COST_ATTRIBUTE_SELECT;
}

export function canAffordAttributeEventGacha(economy: {
  jewels: number;
}): boolean {
  return economy.jewels >= JEWEL_COST_ATTRIBUTE_EVENT_GACHA;
}

export function rollAttributeGachaResults(
  userLevel: number,
  pulls: AttributeGachaPulls,
  random: () => number = Math.random,
): Attribute[] {
  return Array.from({ length: pulls }, () => rollAttribute(userLevel, random));
}

/**
 * 採用しなかった属性をかけらに集計する。
 * - 出目のうち選ばなかったもの
 * - ガチャ結果を採用して属性が変わる場合は、これまでの属性も +1
 * - 現状維持（keepIndex=null）では全出目のみ（これまでの属性はカードに残るため付与しない）
 */
export function tallyUnusedGachaShards(
  rolls: readonly Attribute[],
  keepIndex: number | null,
  previousAttribute?: Attribute,
): Partial<Record<Attribute, number>> {
  const tallies: Partial<Record<Attribute, number>> = {};
  const add = (attribute: Attribute) => {
    tallies[attribute] = (tallies[attribute] ?? 0) + 1;
  };

  rolls.forEach((attribute, index) => {
    if (keepIndex != null && index === keepIndex) return;
    add(attribute);
  });

  if (keepIndex != null && previousAttribute != null) {
    const picked = rolls[keepIndex];
    if (picked != null && picked !== previousAttribute) {
      add(previousAttribute);
    }
  }

  return tallies;
}

export function applyGachaPickToCard(
  card: Card,
  attribute: Attribute,
  userLevel: number,
  paletteShopUnlocks: readonly number[] = [],
): Card {
  return applyAttributeChange(card, attribute, userLevel, paletteShopUnlocks);
}
