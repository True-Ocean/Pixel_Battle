import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import {
  checkerTone,
  drawEllipseOutline,
  drawLine,
  drawRectOutline,
  eraseBrush,
  extractRect,
  floodFill,
  fragmentHasPixels,
  gridSize,
  isCellInRect,
  isStrokeTool,
  moveFragment,
  normalizeRect,
  paintBrush,
  samplePixelColor,
  stampFragment,
  type NormalizedRect,
  type PixelFragment,
} from '../canvas';
import { brushSideLength, type BrushSizeId } from '../config/brushSize';
import type { EditorToolId } from '../config/editorTools';
import type { PixelGrid } from '../types';

interface PixelCanvasProps {
  pixels: PixelGrid;
  onChange: (pixels: PixelGrid) => void;
  onPickColor?: (color: string | null) => void;
  onFillComplete?: () => void;
  tool: EditorToolId;
  brushColor: string;
  brushSize?: BrushSizeId;
  blockDrawingRef?: MutableRefObject<boolean>;
}

export interface PixelCanvasHandle {
  cancelInteraction: () => void;
}

function isDrawingBlocked(
  blockDrawingRef: MutableRefObject<boolean> | undefined,
): boolean {
  return blockDrawingRef?.current ?? false;
}

function isRegionTool(
  tool: EditorToolId,
): tool is 'selection' | 'move' {
  return tool === 'selection' || tool === 'move';
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
  strokeSize: number,
): PixelGrid {
  if (tool === 'line') {
    return drawLine(base, r0, c0, r1, c1, color, strokeSize);
  }
  if (tool === 'rectangle') {
    return drawRectOutline(base, r0, c0, r1, c1, color, strokeSize);
  }
  return drawEllipseOutline(base, r0, c0, r1, c1, color, strokeSize);
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
  mode: 'copy' | 'move';
}

export const PixelCanvas = forwardRef<PixelCanvasHandle, PixelCanvasProps>(
  function PixelCanvas(
    {
      pixels,
      onChange,
      onPickColor,
      onFillComplete,
      tool,
      brushColor,
      brushSize = 'small',
      blockDrawingRef,
    },
    ref,
  ) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const capturedPointerIdsRef = useRef(new Set<number>());
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
    if (isRegionTool(prev) && !isRegionTool(tool)) {
      const floating = floatSelectionRef.current;
      if (floating) {
        const moved =
          floating.originRow !== floating.sourceRect.minRow ||
          floating.originCol !== floating.sourceRect.minCol;
        if (floating.mode === 'move') {
          if (moved) {
            onChange(
              moveFragment(
                pixels,
                floating.sourceRect,
                floating.fragment,
                floating.originRow,
                floating.originCol,
              ),
            );
          }
        } else {
          onChange(
            stampFragment(
              pixels,
              floating.fragment,
              floating.originRow,
              floating.originCol,
            ),
          );
        }
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

  const releaseCapturedPointers = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    for (const pointerId of capturedPointerIdsRef.current) {
      try {
        el.releasePointerCapture(pointerId);
      } catch {
        // ignore
      }
    }
    capturedPointerIdsRef.current.clear();
  }, []);

  const cancelInteraction = useCallback(() => {
    releaseCapturedPointers();
    isDrawingRef.current = false;
    isPlacementDragRef.current = false;
    lastCellRef.current = null;
    shapeAnchorRef.current = null;
    draftPixelsRef.current = null;
    setDraftPixels(null);
    setMarqueeRect(null);
  }, [releaseCapturedPointers]);

  useImperativeHandle(ref, () => ({ cancelInteraction }), [cancelInteraction]);

  const capturePointer = (element: HTMLDivElement, pointerId: number) => {
    element.setPointerCapture(pointerId);
    capturedPointerIdsRef.current.add(pointerId);
  };

  const strokeSize = brushSideLength(brushSize);

  const applyStrokeCell = (grid: PixelGrid, row: number, col: number) => {
    if (tool === 'pen') return paintBrush(grid, row, col, brushColor, strokeSize);
    if (tool === 'eraser') return eraseBrush(grid, row, col, strokeSize);
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
    if (floating.mode === 'move') {
      return moveFragment(
        pixels,
        floating.sourceRect,
        floating.fragment,
        row,
        col,
      );
    }
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
    if (floating.mode === 'move') {
      onChange(
        moveFragment(
          pixels,
          floating.sourceRect,
          floating.fragment,
          floating.originRow,
          floating.originCol,
        ),
      );
    } else {
      onChange(
        stampFragment(
          pixels,
          floating.fragment,
          floating.originRow,
          floating.originCol,
        ),
      );
    }
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
    } else if (isRegionTool(tool)) {
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
            mode: tool === 'move' ? 'move' : 'copy',
          });
        }
        setMarqueeRect(null);
        shapeAnchorRef.current = null;
      }
    }

    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      capturedPointerIdsRef.current.delete(e.pointerId);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDrawingBlocked(blockDrawingRef)) return;
    if (e.button !== 0) return;
    e.preventDefault();

    const cell = cellFromPointer(e.clientX, e.clientY);
    if (!cell) return;

    if (tool === 'fill') {
      onChange(floodFill(pixels, cell.row, cell.col, brushColor));
      onFillComplete?.();
      return;
    }

    if (tool === 'eyedropper') {
      onPickColor?.(samplePixelColor(pixels, cell.row, cell.col));
      return;
    }

    if (isRegionTool(tool)) {
      if (floatSelection) {
        placementGrabOffsetRef.current = {
          row: cell.row - floatSelection.originRow,
          col: cell.col - floatSelection.originCol,
        };
        isPlacementDragRef.current = true;
        isDrawingRef.current = true;
        capturePointer(e.currentTarget, e.pointerId);
        return;
      }

      isDrawingRef.current = true;
      shapeAnchorRef.current = cell;
      basePixelsRef.current = pixels;
      setMarqueeRect(
        normalizeRect(cell.row, cell.col, cell.row, cell.col),
      );
      capturePointer(e.currentTarget, e.pointerId);
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
        strokeSize,
      );
      draftPixelsRef.current = next;
      setDraftPixels(next);
      capturePointer(e.currentTarget, e.pointerId);
      return;
    }

    if (!isStrokeTool(tool)) return;

    isDrawingRef.current = true;
    lastCellRef.current = null;
    capturePointer(e.currentTarget, e.pointerId);
    const next = applyStrokeCell(pixels, cell.row, cell.col);
    draftPixelsRef.current = next;
    setDraftPixels(next);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDrawingBlocked(blockDrawingRef)) {
      if (isDrawingRef.current) cancelInteraction();
      return;
    }
    if (!isDrawingRef.current) return;

    const cell = cellFromPointer(e.clientX, e.clientY);
    if (!cell) return;

    if (isRegionTool(tool)) {
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
        strokeSize,
      );
      draftPixelsRef.current = next;
      setDraftPixels(next);
      return;
    }

    if (!isStrokeTool(tool)) return;
    paintAt(cell.row, cell.col);
  };

  const showFloatSource =
    isRegionTool(tool) &&
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
            isRegionTool(tool) && marqueeRect != null
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
});
