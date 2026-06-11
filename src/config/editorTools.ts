/** 理想の並び順（左/上から。解放済みのみ表示し、この順で並べる） */
export const IDEAL_TOOL_ORDER = [
  'eraser',
  'fill',
  'clear',
  'undo',
  'redo',
  'eyedropper',
  'line',
  'rectangle',
  'circle',
  'selection',
] as const;

export type EditorPaletteToolId = (typeof IDEAL_TOOL_ORDER)[number];

/** UI 実装済みのツール（未実装は解放されても非表示） */
export const IMPLEMENTED_EDITOR_TOOLS: readonly EditorPaletteToolId[] = [
  'eraser',
  'fill',
  'clear',
  'undo',
];

const TOOL_UNLOCK_LEVEL: Record<EditorPaletteToolId, number> = {
  eraser: 1,
  fill: 1,
  clear: 1,
  undo: 2,
  redo: 7,
  eyedropper: 12,
  line: 17,
  selection: 22,
  rectangle: 27,
  circle: 32,
};

export function getToolUnlockLevel(tool: EditorPaletteToolId): number {
  return TOOL_UNLOCK_LEVEL[tool];
}

export function isEditorToolUnlocked(
  tool: EditorPaletteToolId,
  userLevel: number,
): boolean {
  const level = Math.max(1, Math.floor(userLevel));
  return level >= getToolUnlockLevel(tool);
}

export function isEditorToolImplemented(tool: EditorPaletteToolId): boolean {
  return IMPLEMENTED_EDITOR_TOOLS.includes(tool);
}

/** 表示するツール（実装済みかつ解放済み、理想順） */
export function getVisibleEditorTools(userLevel: number): EditorPaletteToolId[] {
  return IDEAL_TOOL_ORDER.filter(
    (tool) =>
      isEditorToolImplemented(tool) && isEditorToolUnlocked(tool, userLevel),
  );
}

/** @deprecated IDEAL_TOOL_ORDER を使用 */
export const EDITOR_TOOL_IDS = IMPLEMENTED_EDITOR_TOOLS;
