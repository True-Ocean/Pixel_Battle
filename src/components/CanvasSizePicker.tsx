import {
  CANVAS_SIZE_MILESTONES,
  getCanvasUnlockLevel,
  type CanvasSize,
} from '../config/canvasUnlock';

interface CanvasSizePickerProps {
  selectedSize: CanvasSize;
  unlockedSizes: readonly CanvasSize[];
  onSelectSize: (size: CanvasSize) => void;
  disabled?: boolean;
  /** 編集時の拡大のみ: これより小さいサイズは選択不可 */
  minSelectableSize?: number;
}

export function CanvasSizePicker({
  selectedSize,
  unlockedSizes,
  onSelectSize,
  disabled = false,
  minSelectableSize,
}: CanvasSizePickerProps) {
  const unlockedSet = new Set(unlockedSizes);
  const minSize =
    minSelectableSize != null
      ? Math.max(1, Math.floor(minSelectableSize))
      : null;

  return (
    <div
      className={[
        'canvas-size-picker',
        disabled ? 'canvas-size-picker--fixed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="toolbar"
      aria-label="キャンバスサイズ"
    >
      <span className="canvas-size-picker-label">サイズ</span>
      <div className="canvas-size-picker-chips">
        {CANVAS_SIZE_MILESTONES.map((size) => {
          const unlocked = unlockedSet.has(size);
          const active = selectedSize === size;
          const unlockLevel = getCanvasUnlockLevel(size);
          const belowMin = minSize != null && size < minSize;
          const showSize = unlocked || (disabled && active) || (belowMin && active);
          const chipDisabled =
            disabled || !unlocked || belowMin || (active && minSize != null);

          return (
            <button
              key={size}
              type="button"
              className={[
                'canvas-size-chip',
                active ? 'active' : '',
                !unlocked ? 'locked' : '',
                belowMin && !active ? 'canvas-size-chip--below-min' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={chipDisabled}
              title={
                belowMin && !active
                  ? '拡大後は元のサイズに戻せません'
                  : showSize
                    ? `${size}×${size}`
                    : `Lv${unlockLevel}で解放`
              }
              onClick={() => onSelectSize(size)}
            >
              {showSize ? (
                <span className="canvas-size-chip-value">{size}</span>
              ) : (
                <span className="canvas-size-chip-lock" aria-hidden>
                  🔒
                </span>
              )}
              <span className="sr-only">
                {showSize ? `${size}×${size}` : `Lv${unlockLevel}で解放`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
