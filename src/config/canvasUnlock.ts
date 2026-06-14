import { CANVAS_SIZE_DEFAULT } from './balance';

/** 解放可能なキャンバスサイズ（昇順・Lv50 上限 34px） */
export const CANVAS_SIZE_MILESTONES = [16, 18, 20, 22, 24, 26, 28, 30, 32, 34] as const;

/** 各サイズの必要ユーザーレベル（docs §5.7） */
export const CANVAS_UNLOCK_LEVELS = [1, 8, 13, 18, 23, 28, 33, 38, 43, 48] as const;

export type CanvasSize = (typeof CANVAS_SIZE_MILESTONES)[number];

export function getMaxCanvasSize(userLevel: number): CanvasSize {
  const level = Math.max(1, Math.floor(userLevel));
  let maxSize: CanvasSize = CANVAS_SIZE_DEFAULT as CanvasSize;
  for (let i = 0; i < CANVAS_SIZE_MILESTONES.length; i++) {
    if (level >= CANVAS_UNLOCK_LEVELS[i]!) {
      maxSize = CANVAS_SIZE_MILESTONES[i]!;
    } else {
      break;
    }
  }
  return maxSize;
}

export function getUnlockedCanvasSizes(userLevel: number): CanvasSize[] {
  const maxSize = getMaxCanvasSize(userLevel);
  const sizes: CanvasSize[] = [];
  for (const size of CANVAS_SIZE_MILESTONES) {
    sizes.push(size);
    if (size === maxSize) break;
  }
  return sizes.length > 0 ? sizes : [CANVAS_SIZE_DEFAULT as CanvasSize];
}

export function isCanvasSizeUnlocked(
  size: number,
  userLevel: number,
): boolean {
  return getUnlockedCanvasSizes(userLevel).includes(size as CanvasSize);
}

/** 新規作成時のデフォルト（解放済みの最大サイズ） */
export function getDefaultCanvasSize(userLevel: number): CanvasSize {
  return getMaxCanvasSize(userLevel);
}

export function getCanvasUnlockLevel(size: CanvasSize): number {
  const index = CANVAS_SIZE_MILESTONES.indexOf(size);
  return index >= 0 ? CANVAS_UNLOCK_LEVELS[index]! : 1;
}
