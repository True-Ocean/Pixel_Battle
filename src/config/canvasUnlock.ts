import { CANVAS_SIZE_DEFAULT } from './balance';

/** 選択可能な最小一辺長 */
export const CANVAS_SIZE_MIN = CANVAS_SIZE_DEFAULT;

/** 上限引き上げのマイルストーン（Lv50 上限 34px） */
export const CANVAS_MAX_MILESTONES = [16, 18, 20, 22, 24, 26, 28, 30, 32, 34] as const;

/** @deprecated CANVAS_MAX_MILESTONES を使用 */
export const CANVAS_SIZE_MILESTONES = CANVAS_MAX_MILESTONES;

/** 各上限の必要ユーザーレベル（docs §5.7） */
export const CANVAS_UNLOCK_LEVELS = [1, 8, 13, 18, 23, 28, 33, 38, 43, 48] as const;

export type CanvasSize = number;

export function getMaxCanvasSize(userLevel: number): number {
  const level = Math.max(1, Math.floor(userLevel));
  let maxSize = CANVAS_SIZE_MIN;
  for (let i = 0; i < CANVAS_MAX_MILESTONES.length; i++) {
    if (level >= CANVAS_UNLOCK_LEVELS[i]!) {
      maxSize = CANVAS_MAX_MILESTONES[i]!;
    } else {
      break;
    }
  }
  return maxSize;
}

/** ドロップダウン用: minSize 〜 解放済み上限の整数列（1px 刻み） */
export function getSelectableCanvasSizes(
  userLevel: number,
  minSize: number = CANVAS_SIZE_MIN,
): number[] {
  const max = getMaxCanvasSize(userLevel);
  const min = Math.max(CANVAS_SIZE_MIN, Math.floor(minSize));
  if (min > max) return [min];

  const sizes: number[] = [];
  for (let size = min; size <= max; size++) {
    sizes.push(size);
  }
  return sizes;
}

/** @deprecated getSelectableCanvasSizes を使用 */
export function getUnlockedCanvasSizes(userLevel: number): number[] {
  return getSelectableCanvasSizes(userLevel);
}

export function isCanvasSizeUnlocked(
  size: number,
  userLevel: number,
): boolean {
  const normalized = Math.floor(size);
  if (normalized < CANVAS_SIZE_MIN) return false;
  return normalized <= getMaxCanvasSize(userLevel);
}

/** 新規作成時のデフォルト（解放済みの最大サイズ） */
export function getDefaultCanvasSize(userLevel: number): number {
  return getMaxCanvasSize(userLevel);
}

/** 指定サイズが使えるようになるレベル（上限モデル） */
export function getCanvasUnlockLevel(size: number): number {
  const target = Math.max(CANVAS_SIZE_MIN, Math.floor(size));
  for (let i = 0; i < CANVAS_MAX_MILESTONES.length; i++) {
    if (target <= CANVAS_MAX_MILESTONES[i]!) {
      return CANVAS_UNLOCK_LEVELS[i]!;
    }
  }
  return CANVAS_UNLOCK_LEVELS[CANVAS_UNLOCK_LEVELS.length - 1]!;
}
