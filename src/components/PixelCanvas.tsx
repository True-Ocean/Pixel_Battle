import { useEffect, useRef, useState } from 'react';
import {
  checkerTone,
  eraseCell,
  floodFill,
  gridSize,
  isStrokeTool,
  paintCell,
} from '../canvas';
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
  const isDrawingRef = useRef(false);
  const lastCellRef = useRef<{ row: number; col: number } | null>(null);
  /** ストローク中の下書き（親への onChange はポインタアップまで遅延） */
  const [draftPixels, setDraftPixels] = useState<PixelGrid | null>(null);
  const draftPixelsRef = useRef<PixelGrid | null>(null);

  const canvasSize = gridSize(pixels);
  const displayPixels = draftPixels ?? pixels;

  useEffect(() => {
    if (!isDrawingRef.current) {
      draftPixelsRef.current = null;
      setDraftPixels(null);
    }
  }, [pixels]);

  const applyStrokeCell = (grid: PixelGrid, row: number, col: number) => {
    if (tool === 'paint') return paintCell(grid, row, col, brushColor);
    if (tool === 'eraser') return eraseCell(grid, row, col);
    return grid;
  };

  const cellFromPointer = (clientX: number, clientY: number) => {
    const el = canvasRef.current;
    if (!el) return null;

    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;

    const col = Math.min(
      canvasSize - 1,
      Math.floor((x / rect.width) * canvasSize),
    );
    const row = Math.min(
      canvasSize - 1,
      Math.floor((y / rect.height) * canvasSize),
    );
    return { row, col };
  };

  const paintAt = (row: number, col: number) => {
    const last = lastCellRef.current;
    if (last?.row === row && last.col === col) return;
    lastCellRef.current = { row, col };
    setDraftPixels((current) => {
      const next = applyStrokeCell(current ?? pixels, row, col);
      draftPixelsRef.current = next;
      return next;
    });
  };

  const commitStroke = () => {
    const final = draftPixelsRef.current;
    if (final != null) {
      onChange(final);
    }
    draftPixelsRef.current = null;
    setDraftPixels(null);
  };

  const endStroke = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastCellRef.current = null;
    if (isStrokeTool(tool)) {
      commitStroke();
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();

    const cell = cellFromPointer(e.clientX, e.clientY);
    if (!cell) return;

    if (tool === 'fill') {
      onChange(floodFill(pixels, cell.row, cell.col, brushColor));
      return;
    }

    if (!isStrokeTool(tool)) return;

    isDrawingRef.current = true;
    lastCellRef.current = null;
    e.currentTarget.setPointerCapture(e.pointerId);
    const next = applyStrokeCell(pixels, cell.row, cell.col);
    draftPixelsRef.current = next;
    setDraftPixels(next);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRef.current || !isStrokeTool(tool)) return;

    const cell = cellFromPointer(e.clientX, e.clientY);
    if (!cell) return;
    paintAt(cell.row, cell.col);
  };

  return (
    <div
      ref={canvasRef}
      className="pixel-canvas pixel-checkerboard"
      style={{
        gridTemplateColumns: `repeat(${canvasSize}, 1fr)`,
      }}
      role="img"
      aria-label={`${canvasSize}×${canvasSize} ドットキャンバス`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endStroke}
      onPointerCancel={endStroke}
      onLostPointerCapture={endStroke}
    >
      {displayPixels.map((row, ri) =>
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
