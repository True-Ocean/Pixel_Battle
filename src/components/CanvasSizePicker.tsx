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
      className="canvas-size-picker"
      role="toolbar"
      aria-label="キャンバスサイズ"
    >
      <span className="canvas-size-picker-label">サイズ</span>
      <div className="canvas-size-picker-chips">
        {CANVAS_SIZE_MILESTONES.map((size) => {
          const unlocked = unlockedSet.has(size);
          const active = selectedSize === size;
          const unlockLevel = getCanvasUnlockLevel(size);

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
                unlocked ? `${size}×${size}` : `Lv${unlockLevel}で解放`
              }
              onClick={() => onSelectSize(size)}
            >
              <span className="canvas-size-chip-value">{size}</span>
              {!unlocked && (
                <span className="canvas-size-chip-lock" aria-hidden>
                  🔒
                </span>
              )}
              <span className="sr-only">
                {size}×{size}
                {!unlocked ? `（Lv${unlockLevel}で解放）` : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
