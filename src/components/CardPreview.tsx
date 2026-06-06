import { CANVAS_SIZE } from '../config/balance';
import { checkerTone } from '../canvas';
import type { PixelGrid } from '../types';

export function CardPreview({ pixels }: { pixels: PixelGrid }) {
  return (
    <div
      className="card-preview pixel-checkerboard"
      style={{ gridTemplateColumns: `repeat(${CANVAS_SIZE}, 1fr)` }}
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
