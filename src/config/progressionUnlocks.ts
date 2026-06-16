import type { Attribute } from '../types';
import {
  calcLevelUpJewelBonus,
  calcLevelUpJewels,
  calcLevelUpPixels,
  calcLevelUpUniversalLimitBreak,
  TALISMAN_STARTER_GRANT_LEVEL,
} from './economy';
import { getCanvasUnlockLevel, getMaxCanvasSize } from './canvasUnlock';
import { ATTRIBUTE_UNLOCK_SCHEDULE } from './attributeUnlock';
import {
  getToolUnlockLevel,
  type EditorToolId,
  IDEAL_TOOL_ORDER,
} from './editorTools';
import { PALETTE_UNLOCK_LEVELS } from './paletteUnlock';
import { PALETTE_COLOR_LABELS } from './palette';

export type LevelUpRewardKind =
  | 'pixels'
  | 'jewels'
  | 'palette'
  | 'attribute'
  | 'tool'
  | 'canvas'
  | 'deck_unlock'
  | 'limit_break'
  | 'lost_unlock'
  | 'lost_encouragement'
  | 'talisman';

export interface LevelUpRewardEntry {
  kind: LevelUpRewardKind;
  label: string;
  /** 属性解放報酬の表示用アイコン */
  attribute?: Attribute;
  /** パレット色解放報酬の表示用スウォッチ */
  paletteIndex?: number;
  /** 経済・限界突破など未実装の表示用 */
  pending?: boolean;
}

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

function paletteRewardForLevel(level: number): LevelUpRewardEntry {
  const index = PALETTE_UNLOCK_LEVELS.indexOf(
    level as (typeof PALETTE_UNLOCK_LEVELS)[number],
  );
  if (index < 0) return { kind: 'palette', label: '新しい色が使えるようになりました！' };

  const paletteIndex = 3 + index;
  const label = PALETTE_COLOR_LABELS[paletteIndex] ?? '色';
  return {
    kind: 'palette',
    label: `お絵描きで${label}が使えるようになりました！`,
    paletteIndex,
  };
}

function attributeRewardForLevel(level: number): LevelUpRewardEntry {
  const entry = ATTRIBUTE_UNLOCK_SCHEDULE.find(({ level: unlockLevel }) => unlockLevel === level);
  return {
    kind: 'attribute',
    label: '新しい属性が解放されました！',
    attribute: entry?.attribute,
  };
}

function toolLabelForLevel(level: number): string {
  for (const tool of IDEAL_TOOL_ORDER) {
    if (getToolUnlockLevel(tool) === level) {
      return `お絵描きツール「${TOOL_LABELS[tool]}」が使えるようになりました！`;
    }
  }
  return '新しいお絵描きツールが使えるようになりました！';
}

function canvasLabelForLevel(level: number): string {
  const maxSize = getMaxCanvasSize(level);
  const unlockLevel = getCanvasUnlockLevel(maxSize);
  if (unlockLevel === level) {
    return `キャンバスが大きくなりました！（最大${maxSize}px）`;
  }
  return 'キャンバスが大きくなりました！';
}

/** Lv5 以降の 5n+m メイン報酬（px・ジュエル除く） */
function getMainRewardAtLevel(level: number): LevelUpRewardEntry | null {
  if (level < 5) return null;

  const mod5 = level % 5;
  const mod10 = level % 10;

  if (level === 10) {
    return { kind: 'deck_unlock', label: 'デッキ2が使えるようになりました！' };
  }
  if (mod10 === 0 && level >= 20) {
    const amount = calcLevelUpUniversalLimitBreak(level);
    return {
      kind: 'limit_break',
      label: `汎用かけら ×${amount.toLocaleString()}`,
    };
  }
  if (mod10 === 5) {
    return paletteRewardForLevel(level);
  }
  if (mod5 === 1) {
    return attributeRewardForLevel(level);
  }
  if (mod5 === 2) {
    return { kind: 'tool', label: toolLabelForLevel(level) };
  }
  if (mod5 === 3) {
    return { kind: 'canvas', label: canvasLabelForLevel(level) };
  }
  if (mod5 === 4) {
    const bonus = calcLevelUpJewelBonus(level);
    return {
      kind: 'jewels',
      label: `💎 ボーナス +${bonus.toLocaleString()} 獲得！`,
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
      label: `${calcLevelUpPixels(L).toLocaleString()}px 獲得！`,
    },
    {
      kind: 'jewels',
      label: `💎 ジュエルを ${calcLevelUpJewels(L).toLocaleString()} 獲得！`,
    },
  ];
  const main = getMainRewardAtLevel(L);
  if (main) rewards.push(main);
  if (L === TALISMAN_STARTER_GRANT_LEVEL) {
    rewards.push({
      kind: 'talisman',
      label: '護符を1個プレゼントしました',
    });
    rewards.push({
      kind: 'lost_unlock',
      label: 'これからは敗北するとカードを1枚ロストします',
    });
    rewards.push({
      kind: 'lost_encouragement',
      label: '慎重に戦っていきましょう！ご武運を！',
    });
  }
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
