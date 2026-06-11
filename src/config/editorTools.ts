/** 理想の並び順（左/上から。解放済みのみ表示し、この順で並べる） */
export const IDEAL_TOOL_ORDER = [
  'pen',
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

export type EditorToolId = (typeof IDEAL_TOOL_ORDER)[number];

/** @deprecated EditorToolId を使用 */
export type EditorPaletteToolId = EditorToolId;

/** ブラシ色を使う描画ツール */
export const COLOR_USING_EDITOR_TOOLS = [
  'pen',
  'fill',
  'line',
  'rectangle',
  'circle',
] as const satisfies readonly EditorToolId[];

/** UI 実装済みのツール（未実装は解放されても非表示） */
export const IMPLEMENTED_EDITOR_TOOLS: readonly EditorToolId[] = [
  'pen',
  'eraser',
  'fill',
  'clear',
  'undo',
  'redo',
  'line',
  'selection',
  'rectangle',
  'circle',
];

const TOOL_UNLOCK_LEVEL: Record<EditorToolId, number> = {
  pen: 1,
  eraser: 1,
  fill: 1,
  clear: 1,
  undo: 7,
  redo: 12,
  line: 17,
  selection: 22,
  rectangle: 27,
  circle: 32,
  /** パレット色が大幅増加した将来用（実装済みだが UI 非表示） */
  eyedropper: 99,
};

export function getToolUnlockLevel(tool: EditorToolId): number {
  return TOOL_UNLOCK_LEVEL[tool];
}

export function isEditorToolUnlocked(
  tool: EditorToolId,
  userLevel: number,
): boolean {
  const level = Math.max(1, Math.floor(userLevel));
  return level >= getToolUnlockLevel(tool);
}

export function isEditorToolImplemented(tool: EditorToolId): boolean {
  return IMPLEMENTED_EDITOR_TOOLS.includes(tool);
}

export function usesBrushColor(tool: EditorToolId): boolean {
  return (COLOR_USING_EDITOR_TOOLS as readonly string[]).includes(tool);
}

/** 表示するツール（実装済みかつ解放済み、理想順） */
export function getVisibleEditorTools(userLevel: number): EditorToolId[] {
  return IDEAL_TOOL_ORDER.filter(
    (tool) =>
      isEditorToolImplemented(tool) && isEditorToolUnlocked(tool, userLevel),
  );
}

/** UI に並べる実装済みツール（理想順。未解放はロック表示） */
export function getDisplayEditorTools(): EditorToolId[] {
  return IDEAL_TOOL_ORDER.filter(isEditorToolImplemented);
}

/** @deprecated IDEAL_TOOL_ORDER を使用 */
export const EDITOR_TOOL_IDS = IMPLEMENTED_EDITOR_TOOLS;
