import { useRef } from 'react';
import { CANVAS_SIZE } from '../config/balance';
import {
  PALETTE_COLOR_LABELS,
  PALETTE_UNLOCKED_COUNT_LV0,
  paletteGridPlacement,
  paletteToolPlacement,
  unlockedPaletteColors,
} from '../config/palette';
import { checkerTone, floodFill } from '../canvas';
import type { PixelGrid } from '../types';

export type EditorTool = 'paint' | 'eraser' | 'fill';

interface PixelCanvasProps {
  pixels: PixelGrid;
  onChange: (pixels: PixelGrid) => void;
  tool: EditorTool;
  brushColor: string;
}

export function PixelCanvas({
  pixels,
  onChange,
  tool,
  brushColor,
}: PixelCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const pixelsRef = useRef(pixels);
  const isDrawingRef = useRef(false);
  const lastCellRef = useRef<{ row: number; col: number } | null>(null);

  pixelsRef.current = pixels;

  const applyAt = (row: number, col: number) => {
    const current = pixelsRef.current;

    if (tool === 'paint') {
      const next = current.map((r, ri) =>
        r.map((cell, ci) => (ri === row && ci === col ? brushColor : cell)),
      );
      pixelsRef.current = next;
      onChange(next);
      return;
    }
    if (tool === 'eraser') {
      const next = current.map((r, ri) =>
        r.map((cell, ci) => (ri === row && ci === col ? null : cell)),
      );
      pixelsRef.current = next;
      onChange(next);
      return;
    }
    const next = floodFill(current, row, col, brushColor);
    pixelsRef.current = next;
    onChange(next);
  };

  const cellFromPointer = (clientX: number, clientY: number) => {
    const el = canvasRef.current;
    if (!el) return null;

    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;

    const col = Math.min(
      CANVAS_SIZE - 1,
      Math.floor((x / rect.width) * CANVAS_SIZE),
    );
    const row = Math.min(
      CANVAS_SIZE - 1,
      Math.floor((y / rect.height) * CANVAS_SIZE),
    );
    return { row, col };
  };

  const paintAt = (row: number, col: number) => {
    const last = lastCellRef.current;
    if (last?.row === row && last.col === col) return;
    lastCellRef.current = { row, col };
    applyAt(row, col);
  };

  const endStroke = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastCellRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();

    const cell = cellFromPointer(e.clientX, e.clientY);
    if (!cell) return;

    isDrawingRef.current = true;
    lastCellRef.current = null;
    e.currentTarget.setPointerCapture(e.pointerId);
    paintAt(cell.row, cell.col);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRef.current || tool === 'fill') return;

    const cell = cellFromPointer(e.clientX, e.clientY);
    if (!cell) return;
    paintAt(cell.row, cell.col);
  };

  return (
    <div
      ref={canvasRef}
      className="pixel-canvas pixel-checkerboard"
      style={{
        gridTemplateColumns: `repeat(${CANVAS_SIZE}, 1fr)`,
      }}
      role="img"
      aria-label={`${CANVAS_SIZE}×${CANVAS_SIZE} ドットキャンバス`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
      onLostPointerCapture={endStroke}
    >
      {pixels.map((row, ri) =>
        row.map((cell, ci) => (
          <div
            key={`${ri}-${ci}`}
            className={
              cell == null
                ? `pixel-cell pixel-cell-empty pixel-checker-${checkerTone(ri, ci)}`
                : 'pixel-cell'
            }
            style={cell != null ? { background: cell } : undefined}
            aria-hidden
          />
        )),
      )}
    </div>
  );
}

export function PalettePicker({
  tool,
  brushColor,
  onSelectColor,
  onSelectTool,
  onClear,
  unlockedCount = PALETTE_UNLOCKED_COUNT_LV0,
}: {
  tool: EditorTool;
  brushColor: string;
  onSelectColor: (color: string) => void;
  onSelectTool: (tool: 'eraser' | 'fill') => void;
  onClear: () => void;
  unlockedCount?: number;
}) {
  const colors = unlockedPaletteColors(unlockedCount);

  return (
    <div
      className="palette-grid palette-grid-2x8"
      role="toolbar"
      aria-label="カラーパレット"
    >
      {colors.map((color, index) => {
        const { row, col } = paletteGridPlacement(index);
        const label = PALETTE_COLOR_LABELS[index];
        const active = tool === 'paint' && brushColor === color;

        const isLight = color === '#ffffff';

        return (
          <button
            key={color}
            type="button"
            className={[
              'palette-swatch',
              isLight ? 'palette-swatch-light' : '',
              active ? 'active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              gridRow: row,
              gridColumn: col,
              background: color,
            }}
            title={label}
            onClick={() => onSelectColor(color)}
          >
            <span className="sr-only">{label}</span>
          </button>
        );
      })}

      <button
        type="button"
        className={
          tool === 'eraser'
            ? 'palette-swatch palette-swatch-tool palette-swatch-eraser active'
            : 'palette-swatch palette-swatch-tool palette-swatch-eraser'
        }
        style={{
          gridRow: paletteToolPlacement('eraser').row,
          gridColumn: paletteToolPlacement('eraser').col,
        }}
        title="消しゴム"
        onClick={() => onSelectTool('eraser')}
      >
        <span className="palette-eraser-icon" aria-hidden>
          <span className="palette-eraser-rubber" />
          <span className="palette-eraser-sleeve" />
        </span>
        <span className="sr-only">消しゴム</span>
      </button>

      <button
        type="button"
        className={
          tool === 'fill'
            ? 'palette-swatch palette-swatch-tool palette-swatch-fill active'
            : 'palette-swatch palette-swatch-tool palette-swatch-fill'
        }
        style={{
          gridRow: paletteToolPlacement('fill').row,
          gridColumn: paletteToolPlacement('fill').col,
        }}
        title="塗りつぶし"
        onClick={() => onSelectTool('fill')}
      >
        <span className="palette-fill-icon" aria-hidden />
        <span className="sr-only">塗りつぶし</span>
      </button>

      <button
        type="button"
        className="palette-swatch palette-swatch-tool palette-swatch-clear pixel-checkerboard pixel-checkerboard-bg"
        style={{
          gridRow: paletteToolPlacement('clear').row,
          gridColumn: paletteToolPlacement('clear').col,
        }}
        title="クリア"
        onClick={onClear}
      >
        <span className="palette-clear-label" aria-hidden>
          クリア
        </span>
        <span className="sr-only">クリア</span>
      </button>
    </div>
  );
}
