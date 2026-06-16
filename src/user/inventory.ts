import { ATTRIBUTE_META } from '../config/attributes';
import { DEV_FILL_ALL_SHARDS } from '../config/devInventory';
import type { LimitBreakShardSpendPlan } from '../card/limitBreak';
import { isValidLimitBreakShardSpend, planLimitBreakShardSpend } from '../card/limitBreak';
import type { Attribute, UserInventory } from '../types';

const ALL_ATTRIBUTES = Object.keys(ATTRIBUTE_META) as Attribute[];

function normalizeShardCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

export function createInitialInventory(): UserInventory {
  return {
    talisman: 0,
    limitBreakUniversal: 0,
    limitBreakShards: {},
  };
}

export function normalizeUserInventory(raw: unknown): UserInventory {
  if (!raw || typeof raw !== 'object') return createInitialInventory();
  const candidate = raw as Partial<UserInventory>;
  const talisman = normalizeShardCount(candidate.talisman);
  const limitBreakUniversal = normalizeShardCount(candidate.limitBreakUniversal);

  const limitBreakShards: Partial<Record<Attribute, number>> = {};
  const rawShards = candidate.limitBreakShards;
  if (rawShards && typeof rawShards === 'object') {
    for (const attribute of ALL_ATTRIBUTES) {
      const count = normalizeShardCount(
        (rawShards as Partial<Record<Attribute, unknown>>)[attribute],
      );
      if (count > 0) {
        limitBreakShards[attribute] = count;
      }
    }
  }

  return { talisman, limitBreakUniversal, limitBreakShards };
}

export function fillAllLimitBreakShards(
  inventory: UserInventory,
  count: number,
): UserInventory {
  const amount = Math.max(0, Math.floor(count));
  return setUniversalLimitBreakShards(
    setAllAttributeLimitBreakShards(inventory, amount),
    amount,
  );
}

export function setAllAttributeLimitBreakShards(
  inventory: UserInventory,
  count: number,
): UserInventory {
  const amount = Math.max(0, Math.floor(count));
  const limitBreakShards: Partial<Record<Attribute, number>> = {};
  for (const attribute of ALL_ATTRIBUTES) {
    limitBreakShards[attribute] = amount;
  }
  return { ...inventory, limitBreakShards };
}

export function setUniversalLimitBreakShards(
  inventory: UserInventory,
  count: number,
): UserInventory {
  const amount = Math.max(0, Math.floor(count));
  return { ...inventory, limitBreakUniversal: amount };
}

export function getUniformAttributeShardsCount(inventory: UserInventory): number {
  let value: number | null = null;
  for (const attribute of ALL_ATTRIBUTES) {
    const count = inventory.limitBreakShards[attribute] ?? 0;
    if (value === null) {
      value = count;
      continue;
    }
    if (value !== count) {
      return inventory.limitBreakShards[ALL_ATTRIBUTES[0]!] ?? 0;
    }
  }
  return value ?? 0;
}

export function applyDevInventoryFill(inventory: UserInventory): UserInventory {
  if (!import.meta.env.DEV || DEV_FILL_ALL_SHARDS == null) return inventory;
  return fillAllLimitBreakShards(inventory, DEV_FILL_ALL_SHARDS);
}

export function inventoryMatchesDevFill(inventory: UserInventory): boolean {
  if (!import.meta.env.DEV || DEV_FILL_ALL_SHARDS == null) return true;
  if (inventory.limitBreakUniversal !== DEV_FILL_ALL_SHARDS) return false;
  return ALL_ATTRIBUTES.every(
    (attribute) =>
      (inventory.limitBreakShards[attribute] ?? 0) === DEV_FILL_ALL_SHARDS,
  );
}

export function addInventoryCount(
  inventory: UserInventory,
  field: 'talisman' | 'limitBreakUniversal',
  amount: number,
): UserInventory {
  const delta = Math.max(0, Math.floor(amount));
  if (delta <= 0) return inventory;
  return { ...inventory, [field]: inventory[field] + delta };
}

export function spendInventoryCount(
  inventory: UserInventory,
  field: 'talisman' | 'limitBreakUniversal',
  amount: number,
): UserInventory | null {
  const cost = Math.max(0, Math.floor(amount));
  if (cost <= 0) return inventory;
  if (inventory[field] < cost) return null;
  return { ...inventory, [field]: inventory[field] - cost };
}

export function addLimitBreakShards(
  inventory: UserInventory,
  attribute: Attribute,
  amount: number,
): UserInventory {
  const delta = Math.max(0, Math.floor(amount));
  if (delta <= 0) return inventory;
  const current = inventory.limitBreakShards[attribute] ?? 0;
  return {
    ...inventory,
    limitBreakShards: {
      ...inventory.limitBreakShards,
      [attribute]: current + delta,
    },
  };
}

export function spendLimitBreakShards(
  inventory: UserInventory,
  attribute: Attribute,
  amount: number,
): UserInventory | null {
  const cost = Math.max(0, Math.floor(amount));
  if (cost <= 0) return inventory;
  const current = inventory.limitBreakShards[attribute] ?? 0;
  if (current < cost) return null;
  const next = current - cost;
  const limitBreakShards = { ...inventory.limitBreakShards };
  if (next <= 0) {
    delete limitBreakShards[attribute];
  } else {
    limitBreakShards[attribute] = next;
  }
  return { ...inventory, limitBreakShards };
}

export function canAffordLimitBreak(
  attributeShardCount: number,
  universalShardCount: number,
): boolean {
  return planLimitBreakShardSpend(attributeShardCount, universalShardCount) != null;
}

/** 指定した内訳でかけらを消費する（専用・汎用は1:1）。 */
export function spendLimitBreakResources(
  inventory: UserInventory,
  attribute: Attribute,
  spend: LimitBreakShardSpendPlan,
): UserInventory | null {
  const attrCount = inventory.limitBreakShards[attribute] ?? 0;
  const universalCount = inventory.limitBreakUniversal;
  if (!isValidLimitBreakShardSpend(spend, attrCount, universalCount)) return null;

  let next = inventory;
  if (spend.attrSpend > 0) {
    const spent = spendLimitBreakShards(next, attribute, spend.attrSpend);
    if (!spent) return null;
    next = spent;
  }
  if (spend.universalSpend > 0) {
    return spendInventoryCount(next, 'limitBreakUniversal', spend.universalSpend);
  }
  return next;
}
