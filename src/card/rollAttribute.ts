import {
  getLatestUnlockedAttribute,
  getUnlockedAttributes,
} from '../config/attributeUnlock';
import type { Attribute } from '../types';

/** 直近解放属性の权重（他属性比 +10% → weight 1.1） */
export const ATTRIBUTE_ROLL_RECENT_BOOST = 1.1;

export function getAttributeRollWeights(
  userLevel: number,
): ReadonlyArray<{ attribute: Attribute; weight: number }> {
  const unlocked = getUnlockedAttributes(userLevel);
  const latest = getLatestUnlockedAttribute(userLevel);
  return unlocked.map((attribute) => ({
    attribute,
    weight: attribute === latest ? ATTRIBUTE_ROLL_RECENT_BOOST : 1,
  }));
}

/** 解放済み属性から权重付きランダム抽選 */
export function rollAttribute(
  userLevel: number,
  random: () => number = Math.random,
): Attribute {
  const entries = getAttributeRollWeights(userLevel);
  if (entries.length === 0) return 'attack';

  let total = 0;
  for (const { weight } of entries) {
    total += weight;
  }

  let roll = random() * total;
  for (const { attribute, weight } of entries) {
    roll -= weight;
    if (roll <= 0) return attribute;
  }
  return entries[entries.length - 1]!.attribute;
}
