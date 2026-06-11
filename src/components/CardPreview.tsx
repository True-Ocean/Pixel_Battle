import { checkerTone, gridSize } from '../canvas';
import type { PixelGrid } from '../types';

export function CardPreview({ pixels }: { pixels: PixelGrid }) {
  const size = gridSize(pixels);

  return (
    <div
      className="card-preview pixel-checkerboard"
      style={{
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        gridTemplateRows: `repeat(${size}, 1fr)`,
      }}
      aria-hidden
    >
      {pixels.map((row, ri) =>
        row.map((cell, ci) => (
          <span
            key={`${ri}-${ci}`}
            className={
              cell == null
                ? `card-preview-cell card-preview-cell-empty pixel-checker-${checkerTone(ri, ci)}`
                : 'card-preview-cell'
            }
            style={cell != null ? { background: cell } : undefined}
          />
        )),
      )}
    </div>
  );
}
