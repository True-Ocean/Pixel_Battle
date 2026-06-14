import {
  LOST_MIN_USER_LEVEL,
  TALISMAN_STARTER_GRANT_COUNT,
  TALISMAN_STARTER_GRANT_LEVEL,
} from '../config/economy';
import type { UserInventory } from '../types';
import { addInventoryCount } from './inventory';

export function isLossEnabledAtUserLevel(userLevel: number): boolean {
  return Math.max(1, Math.floor(userLevel)) >= LOST_MIN_USER_LEVEL;
}

export function crossedTalismanStarterLevel(
  previousLevel: number,
  nextLevel: number,
): boolean {
  const prev = Math.max(1, Math.floor(previousLevel));
  const next = Math.max(1, Math.floor(nextLevel));
  return (
    prev < TALISMAN_STARTER_GRANT_LEVEL && next >= TALISMAN_STARTER_GRANT_LEVEL
  );
}

export function shouldGrantTalismanStarterOnDevSetLevel(
  nextLevel: number,
  alreadyGranted: boolean,
): boolean {
  if (alreadyGranted) return false;
  return Math.max(1, Math.floor(nextLevel)) >= TALISMAN_STARTER_GRANT_LEVEL;
}

export interface TalismanStarterGrantResult {
  inventory: UserInventory;
  talismanStarterGranted: boolean;
  granted: boolean;
}

export function tryGrantTalismanStarter(
  inventory: UserInventory,
  talismanStarterGranted: boolean,
): TalismanStarterGrantResult {
  if (talismanStarterGranted) {
    return { inventory, talismanStarterGranted: true, granted: false };
  }
  return {
    inventory: addInventoryCount(
      inventory,
      'talisman',
      TALISMAN_STARTER_GRANT_COUNT,
    ),
    talismanStarterGranted: true,
    granted: true,
  };
}
