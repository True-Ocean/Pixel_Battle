import { ATTRIBUTE_META } from './attributes';
import { calcLevelUpPixels } from './economy';
import { getCanvasUnlockLevel, getMaxCanvasSize } from './canvasUnlock';
import { ATTRIBUTE_UNLOCK_SCHEDULE } from './attributeUnlock';
import {
  getToolUnlockLevel,
  type EditorToolId,
  IDEAL_TOOL_ORDER,
} from './editorTools';
import { PALETTE_UNLOCK_LEVELS } from './paletteUnlock';

export type LevelUpRewardKind =
  | 'pixels'
  | 'palette'
  | 'attribute'
  | 'tool'
  | 'canvas'
  | 'shop_sample'
  | 'limit_break';

export interface LevelUpRewardEntry {
  kind: LevelUpRewardKind;
  label: string;
  /** 経済・限界突破など未実装の表示用 */
  pending?: boolean;
}

const PALETTE_COLOR_NAMES = ['白', '黒', '赤', '青', '黄', '緑', '橙', '桃', '紫', '茶'] as const;

const TOOL_LABELS: Record<EditorToolId, string> = {
  pen: 'ペン',
  eraser: '消しゴム',
  fill: '塗りつぶし',
  clear: 'クリア',
  undo: '元に戻す',
  redo: 'やり直し',
  eyedropper: 'スポイト',
  line: '直線',
  rectangle: '矩形',
  circle: '円',
  selection: '選択',
};

function paletteLabelForLevel(level: number): string {
  const index = PALETTE_UNLOCK_LEVELS.indexOf(
    level as (typeof PALETTE_UNLOCK_LEVELS)[number],
  );
  if (index < 0) return '新しい色が使えるようになりました！';
  const paletteIndex = 3 + index;
  const name = PALETTE_COLOR_NAMES[paletteIndex] ?? '色';
  return `お絵描きで「${name}」が使えるようになりました！`;
}

function attributeLabelForLevel(level: number): string {
  const entry = ATTRIBUTE_UNLOCK_SCHEDULE.find(({ level: unlockLevel }) => unlockLevel === level);
  if (!entry) return '新しい属性でカードが作れるようになりました！';
  const meta = ATTRIBUTE_META[entry.attribute];
  return `新しい属性「${meta.label}」でカードが作れるようになりました！`;
}

function toolLabelForLevel(level: number): string {
  for (const tool of IDEAL_TOOL_ORDER) {
    if (getToolUnlockLevel(tool) === level) {
      return `「${TOOL_LABELS[tool]}」が使えるようになりました！`;
    }
  }
  return '新しい描画ツールが使えるようになりました！';
}

function canvasLabelForLevel(level: number): string {
  const maxSize = getMaxCanvasSize(level);
  const unlockLevel = getCanvasUnlockLevel(maxSize);
  if (unlockLevel === level) {
    return `キャンバスが大きくなりました！（最大${maxSize}px）`;
  }
  return 'キャンバスが大きくなりました！';
}

/** Lv5 以降の 5n+m メイン報酬（無償ピクセル除く） */
function getMainRewardAtLevel(level: number): LevelUpRewardEntry | null {
  if (level < 5) return null;

  const mod5 = level % 5;
  const mod10 = level % 10;

  if (mod10 === 5) {
    return { kind: 'palette', label: paletteLabelForLevel(level) };
  }
  if (mod10 === 0 && level >= 10) {
    return {
      kind: 'limit_break',
      label: '汎用限界突破アイテム',
      pending: true,
    };
  }
  if (mod5 === 1) {
    return { kind: 'attribute', label: attributeLabelForLevel(level) };
  }
  if (mod5 === 2) {
    return { kind: 'tool', label: toolLabelForLevel(level) };
  }
  if (mod5 === 3) {
    return { kind: 'canvas', label: canvasLabelForLevel(level) };
  }
  if (mod5 === 4) {
    return {
      kind: 'shop_sample',
      label: 'ショップ試供品',
      pending: true,
    };
  }
  return null;
}

/** 指定レベル到達時の報酬一覧（表示用） */
export function getLevelUpRewardsAtLevel(level: number): LevelUpRewardEntry[] {
  const L = Math.max(1, Math.floor(level));
  const rewards: LevelUpRewardEntry[] = [
    {
      kind: 'pixels',
      label: `無償ピクセルを ${calcLevelUpPixels(L).toLocaleString()} 獲得！`,
    },
  ];
  const main = getMainRewardAtLevel(L);
  if (main) rewards.push(main);
  return rewards;
}

/** レベルアップで到達した各レベルの報酬を順に返す */
export function collectLevelUpRewards(
  fromLevel: number,
  toLevel: number,
): Array<{ level: number; rewards: LevelUpRewardEntry[] }> {
  const start = Math.floor(fromLevel);
  const end = Math.floor(toLevel);
  if (end <= start) return [];

  const result: Array<{ level: number; rewards: LevelUpRewardEntry[] }> = [];
  for (let level = start + 1; level <= end; level++) {
    result.push({ level, rewards: getLevelUpRewardsAtLevel(level) });
  }
  return result;
}
