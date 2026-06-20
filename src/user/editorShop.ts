import {
  canPurchaseEditorFeature,
  JEWEL_COST_EDITOR_EARLY_UNLOCK,
  normalizeEditorShopUnlocks,
  type EditorShopUnlockId,
} from '../config/editorShop';
import type { UserEconomy } from '../types';
import { spendJewels } from './economy';

export { normalizeEditorShopUnlocks };

export function unlockEditorFeatureWithJewels(
  feature: EditorShopUnlockId,
  userLevel: number,
  economy: UserEconomy,
  shopUnlocks: readonly EditorShopUnlockId[],
): { economy: UserEconomy; shopUnlocks: EditorShopUnlockId[] } | null {
  if (!canPurchaseEditorFeature(feature, userLevel, shopUnlocks)) return null;
  const nextEconomy = spendJewels(economy, JEWEL_COST_EDITOR_EARLY_UNLOCK);
  if (!nextEconomy) return null;
  return {
    economy: nextEconomy,
    shopUnlocks: normalizeEditorShopUnlocks([...shopUnlocks, feature]),
  };
}
