import type { EditorToolId } from './editorTools';
import { isEditorToolUnlockedAtLevel } from './editorTools';

/** Lv1 初期ツール（💎 早期解放不可） */
export const EDITOR_INITIAL_TOOL_IDS = [
  'pen',
  'eraser',
  'fill',
  'clear',
] as const satisfies readonly EditorToolId[];

export const EDITOR_SHOP_UNLOCK_IDS = [
  'undo',
  'redo',
  'line',
  'rectangle',
  'circle',
  'move',
  'copy',
  'brushSize',
  'zoom',
] as const;

export type EditorShopUnlockId = (typeof EDITOR_SHOP_UNLOCK_IDS)[number];

export const JEWEL_COST_EDITOR_EARLY_UNLOCK = 20;

/** レベル解放（L≡2: 7, 12, …, 47） */
export const EDITOR_FEATURE_UNLOCK_LEVEL: Record<EditorShopUnlockId, number> = {
  undo: 7,
  redo: 12,
  line: 17,
  rectangle: 22,
  circle: 27,
  move: 32,
  copy: 37,
  brushSize: 42,
  zoom: 47,
};

export const EDITOR_FEATURE_LABELS: Record<EditorShopUnlockId, string> = {
  undo: '元に戻す',
  redo: 'やり直し',
  line: '直線',
  rectangle: '矩形',
  circle: '円',
  move: '移動',
  copy: 'コピー',
  brushSize: '太さ',
  zoom: 'ズーム',
};

const TOOL_TO_SHOP_ID: Partial<Record<EditorToolId, EditorShopUnlockId>> = {
  undo: 'undo',
  redo: 'redo',
  line: 'line',
  rectangle: 'rectangle',
  circle: 'circle',
  move: 'move',
  selection: 'copy',
};

export function normalizeEditorShopUnlocks(raw: unknown): EditorShopUnlockId[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<EditorShopUnlockId>();
  const next: EditorShopUnlockId[] = [];
  for (const value of raw) {
    if (typeof value !== 'string') continue;
    if (!(EDITOR_SHOP_UNLOCK_IDS as readonly string[]).includes(value)) continue;
    const id = value as EditorShopUnlockId;
    if (seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  return next;
}

export function editorShopIdForTool(
  tool: EditorToolId,
): EditorShopUnlockId | null {
  return TOOL_TO_SHOP_ID[tool] ?? null;
}

export function isEditorInitialTool(tool: EditorToolId): boolean {
  return (EDITOR_INITIAL_TOOL_IDS as readonly string[]).includes(tool);
}

export function isEditorShopUnlocked(
  feature: EditorShopUnlockId,
  shopUnlocks: readonly EditorShopUnlockId[],
): boolean {
  return shopUnlocks.includes(feature);
}

export function isEditorFeatureUnlockedAtLevel(
  feature: EditorShopUnlockId,
  userLevel: number,
): boolean {
  const level = Math.max(1, Math.floor(userLevel));
  return level >= EDITOR_FEATURE_UNLOCK_LEVEL[feature];
}

export function isEditorFeatureUnlocked(
  feature: EditorShopUnlockId,
  userLevel: number,
  shopUnlocks: readonly EditorShopUnlockId[] = [],
): boolean {
  return (
    isEditorShopUnlocked(feature, shopUnlocks) ||
    isEditorFeatureUnlockedAtLevel(feature, userLevel)
  );
}

export function canPurchaseEditorFeature(
  feature: EditorShopUnlockId,
  userLevel: number,
  shopUnlocks: readonly EditorShopUnlockId[],
): boolean {
  return !isEditorFeatureUnlocked(feature, userLevel, shopUnlocks);
}

export function getEditorToolDisplayLabel(tool: EditorToolId): string {
  if (tool === 'selection') return 'コピー';
  const shopId = editorShopIdForTool(tool);
  if (shopId) return EDITOR_FEATURE_LABELS[shopId];
  switch (tool) {
    case 'pen':
      return 'ペン';
    case 'eraser':
      return '消しゴム';
    case 'fill':
      return '塗りつぶし';
    case 'clear':
      return 'クリア';
    default:
      return tool;
  }
}

export function isEditorToolAvailable(
  tool: EditorToolId,
  userLevel: number,
  shopUnlocks: readonly EditorShopUnlockId[] = [],
): boolean {
  if (isEditorInitialTool(tool)) {
    return isEditorToolUnlockedAtLevel(tool, userLevel);
  }
  const shopId = editorShopIdForTool(tool);
  if (!shopId) {
    return isEditorToolUnlockedAtLevel(tool, userLevel);
  }
  return isEditorFeatureUnlocked(shopId, userLevel, shopUnlocks);
}
