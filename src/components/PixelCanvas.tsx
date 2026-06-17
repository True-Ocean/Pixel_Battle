import { useEffect, useRef, useState } from 'react';
import {
  checkerTone,
  drawEllipseOutline,
  drawLine,
  drawRectOutline,
  eraseCell,
  extractRect,
  floodFill,
  fragmentHasPixels,
  gridSize,
  isCellInRect,
  isStrokeTool,
  normalizeRect,
  paintCell,
  samplePixelColor,
  stampFragment,
  type NormalizedRect,
  type PixelFragment,
} from '../canvas';
import type { EditorToolId } from '../config/editorTools';
import type { PixelGrid } from '../types';

interface PixelCanvasProps {
  pixels: PixelGrid;
  onChange: (pixels: PixelGrid) => void;
  onPickColor?: (color: string | null) => void;
  tool: EditorToolId;
  brushColor: string;
}

function isShapeDragTool(
  tool: EditorToolId,
): tool is 'line' | 'rectangle' | 'circle' {
  return tool === 'line' || tool === 'rectangle' || tool === 'circle';
}

function applyShapePreview(
  base: PixelGrid,
  tool: 'line' | 'rectangle' | 'circle',
  r0: number,
  c0: number,
  r1: number,
  c1: number,
  color: string,
): PixelGrid {
  if (tool === 'line') return drawLine(base, r0, c0, r1, c1, color);
  if (tool === 'rectangle') return drawRectOutline(base, r0, c0, r1, c1, color);
  return drawEllipseOutline(base, r0, c0, r1, c1, color);
}

function isMarqueeEdge(
  row: number,
  col: number,
  rect: NormalizedRect,
): boolean {
  return (
    ((row === rect.minRow || row === rect.maxRow) &&
      col >= rect.minCol &&
      col <= rect.maxCol) ||
    ((col === rect.minCol || col === rect.maxCol) &&
      row >= rect.minRow &&
      row <= rect.maxRow)
  );
}

interface FloatSelection {
  sourceRect: NormalizedRect;
  fragment: PixelFragment;
  originRow: number;
  originCol: number;
}

export function PixelCanvas({
  pixels,
  onChange,
  onPickColor,
  tool,
  brushColor,
}: PixelCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const lastCellRef = useRef<{ row: number; col: number } | null>(null);
  const basePixelsRef = useRef<PixelGrid>(pixels);
  const shapeAnchorRef = useRef<{ row: number; col: number } | null>(null);
  const [draftPixels, setDraftPixels] = useState<PixelGrid | null>(null);
  const draftPixelsRef = useRef<PixelGrid | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<NormalizedRect | null>(null);
  const [floatSelection, setFloatSelection] = useState<FloatSelection | null>(
    null,
  );
  const floatSelectionRef = useRef(floatSelection);
  const isPlacementDragRef = useRef(false);
  const placementGrabOffsetRef = useRef({ row: 0, col: 0 });
  const prevToolRef = useRef(tool);

  floatSelectionRef.current = floatSelection;

  const canvasSize = gridSize(pixels);
  const displayPixels = draftPixels ?? pixels;

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const prevent = (e: Event) => e.preventDefault();
    el.addEventListener('selectstart', prevent);
    return () => el.removeEventListener('selectstart', prevent);
  }, []);

  useEffect(() => {
    if (!isDrawingRef.current) {
      draftPixelsRef.current = null;
      setDraftPixels(null);
    }
  }, [pixels]);

  useEffect(() => {
    const prev = prevToolRef.current;
    prevToolRef.current = tool;
    if (prev === 'selection' && tool !== 'selection') {
      const floating = floatSelectionRef.current;
      if (floating) {
        onChange(
          stampFragment(
            pixels,
            floating.fragment,
            floating.originRow,
            floating.originCol,
          ),
        );
        setFloatSelection(null);
      }
      setMarqueeRect(null);
      isPlacementDragRef.current = false;
    }
  }, [tool, pixels, onChange]);

  const clearFloatSelection = () => {
    setFloatSelection(null);
    isPlacementDragRef.current = false;
    draftPixelsRef.current = null;
    setDraftPixels(null);
  };

  const applyStrokeCell = (grid: PixelGrid, row: number, col: number) => {
    if (tool === 'pen') return paintCell(grid, row, col, brushColor);
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

  const commitShape = () => {
    const final = draftPixelsRef.current;
    if (final != null) {
      onChange(final);
    }
    draftPixelsRef.current = null;
    setDraftPixels(null);
    shapeAnchorRef.current = null;
  };

  const buildPlacementPreview = (
    floating: FloatSelection,
    row: number,
    col: number,
  ): PixelGrid => {
    return stampFragment(pixels, floating.fragment, row, col);
  };

  const updatePlacementPreview = (row: number, col: number) => {
    const floating = floatSelectionRef.current;
    if (!floating) return;
    setFloatSelection({
      ...floating,
      originRow: row,
      originCol: col,
    });
    const preview = buildPlacementPreview(floating, row, col);
    draftPixelsRef.current = preview;
    setDraftPixels(preview);
  };

  const commitPlacement = () => {
    const floating = floatSelectionRef.current;
    if (!floating) return;
    onChange(
      stampFragment(
        pixels,
        floating.fragment,
        floating.originRow,
        floating.originCol,
      ),
    );
    clearFloatSelection();
  };

  const endStroke = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastCellRef.current = null;

    if (isStrokeTool(tool)) {
      commitStroke();
    } else if (isShapeDragTool(tool)) {
      commitShape();
    } else if (tool === 'selection') {
      if (isPlacementDragRef.current) {
        commitPlacement();
      } else if (shapeAnchorRef.current && marqueeRect) {
        const fragment = extractRect(basePixelsRef.current, marqueeRect);
        if (fragmentHasPixels(fragment)) {
          setFloatSelection({
            sourceRect: marqueeRect,
            fragment,
            originRow: marqueeRect.minRow,
            originCol: marqueeRect.minCol,
          });
        }
        setMarqueeRect(null);
        shapeAnchorRef.current = null;
      }
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

    if (tool === 'eyedropper') {
      onPickColor?.(samplePixelColor(pixels, cell.row, cell.col));
      return;
    }

    if (tool === 'selection') {
      if (floatSelection) {
        placementGrabOffsetRef.current = {
          row: cell.row - floatSelection.originRow,
          col: cell.col - floatSelection.originCol,
        };
        isPlacementDragRef.current = true;
        isDrawingRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      isDrawingRef.current = true;
      shapeAnchorRef.current = cell;
      basePixelsRef.current = pixels;
      setMarqueeRect(
        normalizeRect(cell.row, cell.col, cell.row, cell.col),
      );
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (isShapeDragTool(tool)) {
      isDrawingRef.current = true;
      shapeAnchorRef.current = cell;
      basePixelsRef.current = pixels;
      const next = applyShapePreview(
        pixels,
        tool,
        cell.row,
        cell.col,
        cell.row,
        cell.col,
        brushColor,
      );
      draftPixelsRef.current = next;
      setDraftPixels(next);
      e.currentTarget.setPointerCapture(e.pointerId);
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
    if (!isDrawingRef.current) return;

    const cell = cellFromPointer(e.clientX, e.clientY);
    if (!cell) return;

    if (tool === 'selection') {
      if (isPlacementDragRef.current) {
        const offset = placementGrabOffsetRef.current;
        updatePlacementPreview(
          cell.row - offset.row,
          cell.col - offset.col,
        );
        return;
      }
      const anchor = shapeAnchorRef.current;
      if (!anchor) return;
      setMarqueeRect(
        normalizeRect(anchor.row, anchor.col, cell.row, cell.col),
      );
      return;
    }

    if (isShapeDragTool(tool)) {
      const anchor = shapeAnchorRef.current;
      if (!anchor) return;
      const next = applyShapePreview(
        basePixelsRef.current,
        tool,
        anchor.row,
        anchor.col,
        cell.row,
        cell.col,
        brushColor,
      );
      draftPixelsRef.current = next;
      setDraftPixels(next);
      return;
    }

    if (!isStrokeTool(tool)) return;
    paintAt(cell.row, cell.col);
  };

  const showFloatSource =
    tool === 'selection' &&
    floatSelection != null &&
    draftPixels == null &&
    !isPlacementDragRef.current;

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
      onContextMenu={(e) => e.preventDefault()}
    >
      {displayPixels.map((row, ri) =>
        row.map((cell, ci) => {
          const marquee =
            tool === 'selection' && marqueeRect != null
              ? isMarqueeEdge(ri, ci, marqueeRect)
              : false;
          const floatSource =
            showFloatSource &&
            floatSelection != null &&
            isCellInRect(ri, ci, floatSelection.sourceRect);
          const floatEdge =
            showFloatSource &&
            floatSelection != null &&
            isMarqueeEdge(ri, ci, floatSelection.sourceRect);
          return (
            <div
              key={`${ri}-${ci}`}
              className={[
                cell == null
                  ? `pixel-cell pixel-cell-empty pixel-checker-${checkerTone(ri, ci)}`
                  : 'pixel-cell',
                marquee ? 'pixel-cell-marquee' : '',
                floatSource ? 'pixel-cell-float-source' : '',
                floatEdge ? 'pixel-cell-float-edge' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={cell != null ? { background: cell } : undefined}
              aria-hidden
            />
          );
        }),
      )}
    </div>
  );
}
