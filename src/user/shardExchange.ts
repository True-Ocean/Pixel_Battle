import {
  ATTRIBUTE_MELT_FEE_PX_PER_UNIVERSAL,
  ATTRIBUTE_TO_UNIVERSAL_SHARD_RATIO,
  UNIVERSAL_TO_ATTRIBUTE_SHARD_RATIO,
} from '../config/economy';
import type { Attribute, UserEconomy, UserInventory } from '../types';
import { spendFreePixels } from './economy';
import {
  addInventoryCount,
  addLimitBreakShards,
  spendInventoryCount,
  spendLimitBreakShards,
} from './inventory';

export function calcUniversalCostForAttributeShards(
  attributeAmount: number,
): number {
  const amount = Math.max(0, Math.floor(attributeAmount));
  return amount * UNIVERSAL_TO_ATTRIBUTE_SHARD_RATIO;
}

export function calcAttributeMeltOutcome(attributeAmount: number): {
  universalGained: number;
  pixelFee: number;
} {
  const amount = Math.max(0, Math.floor(attributeAmount));
  const universalGained = amount * ATTRIBUTE_TO_UNIVERSAL_SHARD_RATIO;
  return {
    universalGained,
    pixelFee: universalGained * ATTRIBUTE_MELT_FEE_PX_PER_UNIVERSAL,
  };
}

/** 汎用かけら → 属性かけら（2:1）。`attributeAmount` は得る属性かけら数。 */
export function exchangeUniversalToAttribute(
  inventory: UserInventory,
  attribute: Attribute,
  attributeAmount: number,
): UserInventory | null {
  const amount = Math.floor(attributeAmount);
  if (!Number.isInteger(attributeAmount) || amount <= 0) return null;
  const universalCost = calcUniversalCostForAttributeShards(amount);
  const spent = spendInventoryCount(
    inventory,
    'limitBreakUniversal',
    universalCost,
  );
  if (!spent) return null;
  return addLimitBreakShards(spent, attribute, amount);
}

/** 属性かけら → 汎用かけら（1:2）＋得た汎用×10px。`attributeAmount` は溶かす属性かけら数。 */
export function meltAttributeToUniversal(
  inventory: UserInventory,
  economy: UserEconomy,
  attribute: Attribute,
  attributeAmount: number,
): { inventory: UserInventory; economy: UserEconomy } | null {
  const amount = Math.floor(attributeAmount);
  if (!Number.isInteger(attributeAmount) || amount <= 0) return null;
  const { universalGained, pixelFee } = calcAttributeMeltOutcome(amount);
  const spentShards = spendLimitBreakShards(inventory, attribute, amount);
  if (!spentShards) return null;
  const spentPx = spendFreePixels(economy, pixelFee);
  if (!spentPx) return null;
  return {
    inventory: addInventoryCount(
      spentShards,
      'limitBreakUniversal',
      universalGained,
    ),
    economy: spentPx,
  };
}
