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
}

export function CanvasSizePicker({
  selectedSize,
  unlockedSizes,
  onSelectSize,
  disabled = false,
}: CanvasSizePickerProps) {
  const unlockedSet = new Set(unlockedSizes);

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
          const showSize = unlocked || (disabled && active);

          return (
            <button
              key={size}
              type="button"
              className={[
                'canvas-size-chip',
                active ? 'active' : '',
                !unlocked ? 'locked' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={disabled || !unlocked}
              title={
                showSize ? `${size}×${size}` : `Lv${unlockLevel}で解放`
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
