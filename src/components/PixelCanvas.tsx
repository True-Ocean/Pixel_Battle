import { useEffect, useRef, useState } from 'react';
import {
  PALETTE_16,
  PALETTE_PLAYABLE_COUNT,
} from '../config/balance';
import {
  PALETTE_COLOR_LABELS,
  paletteEditorSlotPlacement,
  paletteToolPlacement,
} from '../config/palette';
import {
  isPaletteUnlockedAtLevel,
  PALETTE_UNLOCK_LEVELS,
} from '../config/paletteUnlock';
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

function paletteUnlockLevelForIndex(index: number): number | null {
  if (index < 3) return 1;
  const extraIndex = index - 3;
  return PALETTE_UNLOCK_LEVELS[extraIndex] ?? null;
}

export function PalettePicker({
  tool,
  brushColor,
  onSelectColor,
  onSelectTool,
  onClear,
  userLevel = 1,
}: {
  tool: EditorTool;
  brushColor: string;
  onSelectColor: (color: string) => void;
  onSelectTool: (tool: 'eraser' | 'fill') => void;
  onClear: () => void;
  userLevel?: number;
}) {
  const colorSlots = Array.from({ length: PALETTE_PLAYABLE_COUNT }, (_, index) => {
    const color = PALETTE_16[index]!;
    const placement = paletteEditorSlotPlacement(index);
    const unlocked = isPaletteUnlockedAtLevel(index, userLevel);
    const unlockLevel = paletteUnlockLevelForIndex(index);
    const label = PALETTE_COLOR_LABELS[index];
    const active = tool === 'paint' && brushColor === color;
    const isLight = color === '#ffffff';

    if (!placement) return null;

    return (
      <button
        key={color}
        type="button"
        className={[
          'palette-swatch',
          isLight ? 'palette-swatch-light' : '',
          active ? 'active' : '',
          !unlocked ? 'palette-swatch-locked' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          gridRow: placement.row,
          gridColumn: placement.col,
          background: unlocked ? color : undefined,
        }}
        disabled={!unlocked}
        title={
          unlocked
            ? label
            : unlockLevel != null
              ? `Lv${unlockLevel}で解放`
              : label
        }
        onClick={() => onSelectColor(color)}
      >
        {!unlocked && (
          <span className="palette-swatch-lock" aria-hidden>
            🔒
          </span>
        )}
        <span className="sr-only">
          {label}
          {!unlocked && unlockLevel != null ? `（Lv${unlockLevel}で解放）` : ''}
        </span>
      </button>
    );
  });

  return (
    <div
      className="palette-grid palette-grid-2x8"
      role="toolbar"
      aria-label="カラーパレット"
    >
      {colorSlots}

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
