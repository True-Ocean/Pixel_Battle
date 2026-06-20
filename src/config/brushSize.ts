export const BRUSH_SIZE_IDS = ['small', 'medium', 'large'] as const;

export type BrushSizeId = (typeof BRUSH_SIZE_IDS)[number];

export const BRUSH_SIZE_LABELS: Record<BrushSizeId, string> = {
  small: '小',
  medium: '中',
  large: '大',
};

const BRUSH_SIDE_LENGTHS: Record<BrushSizeId, number> = {
  small: 1,
  medium: 2,
  large: 3,
};

/** ブラシの一辺の長さ（マス数）: 小=1、中=2、大=3 */
export function brushSideLength(size: BrushSizeId): number {
  return BRUSH_SIDE_LENGTHS[size];
}
