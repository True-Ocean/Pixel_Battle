import { CANVAS_SIZE_DEFAULT } from './balance';

/** 解放可能なキャンバスサイズ（昇順） */
export const CANVAS_SIZE_MILESTONES = [16, 20, 24, 28, 32, 36] as const;

/** 各サイズの必要ユーザーレベル */
export const CANVAS_UNLOCK_LEVELS = [1, 10, 20, 30, 40, 50] as const;

export type CanvasSize = (typeof CANVAS_SIZE_MILESTONES)[number];

export function getUnlockedCanvasSizes(userLevel: number): CanvasSize[] {
  const level = Math.max(1, Math.floor(userLevel));
  const sizes: CanvasSize[] = [];
  for (let i = 0; i < CANVAS_SIZE_MILESTONES.length; i++) {
    if (level >= CANVAS_UNLOCK_LEVELS[i]!) {
      sizes.push(CANVAS_SIZE_MILESTONES[i]!);
    }
  }
  return sizes.length > 0 ? sizes : [CANVAS_SIZE_DEFAULT];
}

export function isCanvasSizeUnlocked(
  size: number,
  userLevel: number,
): boolean {
  return getUnlockedCanvasSizes(userLevel).includes(size as CanvasSize);
}

/** 新規作成時のデフォルト（解放済みの最大サイズ） */
export function getDefaultCanvasSize(userLevel: number): CanvasSize {
  const unlocked = getUnlockedCanvasSizes(userLevel);
  return unlocked[unlocked.length - 1] ?? CANVAS_SIZE_DEFAULT;
}

export function getCanvasUnlockLevel(size: CanvasSize): number {
  const index = CANVAS_SIZE_MILESTONES.indexOf(size);
  return index >= 0 ? CANVAS_UNLOCK_LEVELS[index]! : 1;
}
