import { useId } from 'react';

interface CanvasSizePickerProps {
  selectedSize: number;
  selectableSizes: readonly number[];
  onSelectSize: (size: number) => void;
  disabled?: boolean;
}

export function CanvasSizePicker({
  selectedSize,
  selectableSizes,
  onSelectSize,
  disabled = false,
}: CanvasSizePickerProps) {
  const selectId = useId();
  const pickerDisabled = disabled || selectableSizes.length <= 1;

  return (
    <div className="canvas-size-picker">
      <label className="canvas-size-picker-label" htmlFor={selectId}>
        サイズ
      </label>
      <select
        id={selectId}
        className="canvas-size-select"
        value={selectedSize}
        disabled={pickerDisabled}
        aria-label="キャンバスサイズ"
        onChange={(event) => {
          const nextSize = Number(event.target.value);
          if (!Number.isFinite(nextSize)) return;
          onSelectSize(nextSize);
        }}
      >
        {selectableSizes.map((size) => (
          <option key={size} value={size}>
            {size}×{size}
          </option>
        ))}
      </select>
    </div>
  );
}
