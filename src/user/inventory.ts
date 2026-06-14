import { ATTRIBUTE_META } from '../config/attributes';
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
