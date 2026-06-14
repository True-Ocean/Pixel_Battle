import { gridSize } from '../canvas';
import type { PixelGrid } from '../types';

interface PixelIconPreviewProps {
  pixels: PixelGrid;
  /** 表示サイズ（px） */
  size?: number;
  className?: string;
}

/** 小さなドット絵アイコン（チェッカーなし・背景透過） */
export function PixelIconPreview({
  pixels,
  size = 16,
  className,
}: PixelIconPreviewProps) {
  const dimension = gridSize(pixels);

  return (
    <div
      className={['pixel-icon-preview', className].filter(Boolean).join(' ')}
      style={{
        width: size,
        height: size,
        gridTemplateColumns: `repeat(${dimension}, 1fr)`,
        gridTemplateRows: `repeat(${dimension}, 1fr)`,
      }}
      aria-hidden
    >
      {pixels.map((row, rowIndex) =>
        row.map((cell, columnIndex) => (
          <span
            key={`${rowIndex}-${columnIndex}`}
            className="pixel-icon-preview-cell"
            style={cell != null ? { background: cell } : undefined}
          />
        )),
      )}
    </div>
  );
}
