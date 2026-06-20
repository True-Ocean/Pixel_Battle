import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const MIN_PINCH_DISTANCE = 8;

interface EditorCanvasViewportProps {
  zoomEnabled: boolean;
  blockDrawingRef?: MutableRefObject<boolean>;
  onPinchStart?: () => void;
  children: React.ReactNode;
}

interface Point {
  x: number;
  y: number;
}

interface ContentSize {
  width: number;
  height: number;
}

interface PinchFrame {
  distance: number;
  center: Point;
  zoom: number;
  pan: Point;
}

function pointerDistance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointerCenter(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function viewportPointFromClient(
  clientX: number,
  clientY: number,
  viewport: HTMLElement,
): Point {
  const rect = viewport.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function getContentSize(viewport: HTMLElement): ContentSize {
  const canvas = viewport.querySelector('.pixel-canvas');
  if (canvas instanceof HTMLElement) {
    return { width: canvas.offsetWidth, height: canvas.offsetHeight };
  }
  return { width: viewport.clientWidth, height: viewport.clientHeight };
}

function clampPan(
  pan: Point,
  zoom: number,
  content: ContentSize,
): Point {
  if (zoom <= MIN_ZOOM + 0.001) {
    return { x: 0, y: 0 };
  }

  const minX = content.width * (1 - zoom);
  const minY = content.height * (1 - zoom);

  return {
    x: Math.min(0, Math.max(minX, pan.x)),
    y: Math.min(0, Math.max(minY, pan.y)),
  };
}

/** 前フレームからの距離比で拡大。指を広げると zoom が上がる */
export function applyPinchStep(
  last: PinchFrame,
  currentDistance: number,
  currentCenter: Point,
  content: ContentSize,
): { zoom: number; pan: Point } {
  const safeLastDistance = Math.max(last.distance, MIN_PINCH_DISTANCE);
  const safeCurrentDistance = Math.max(currentDistance, MIN_PINCH_DISTANCE);
  const scaleFactor = safeCurrentDistance / safeLastDistance;
  const nextZoom = Math.min(
    MAX_ZOOM,
    Math.max(MIN_ZOOM, last.zoom * scaleFactor),
  );
  const zoomRatio = nextZoom / last.zoom;

  const nextPan = {
    x:
      last.pan.x +
      (currentCenter.x - last.center.x) +
      (last.center.x - last.pan.x) * (1 - zoomRatio),
    y:
      last.pan.y +
      (currentCenter.y - last.center.y) +
      (last.center.y - last.pan.y) * (1 - zoomRatio),
  };

  return {
    zoom: nextZoom,
    pan: clampPan(nextPan, nextZoom, content),
  };
}

export function EditorCanvasViewport({
  zoomEnabled,
  blockDrawingRef,
  onPinchStart,
  children,
}: EditorCanvasViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const pointersRef = useRef(new Map<number, Point>());
  const lastPinchRef = useRef<PinchFrame | null>(null);
  const multiTouchSessionRef = useRef(false);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);

  zoomRef.current = zoom;
  panRef.current = pan;

  const syncDrawingBlocked = useCallback(() => {
    if (!blockDrawingRef) return;
    blockDrawingRef.current =
      multiTouchSessionRef.current || pointersRef.current.size >= 2;
  }, [blockDrawingRef]);

  const resetView = useCallback(() => {
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!zoomEnabled) {
      multiTouchSessionRef.current = false;
      pointersRef.current.clear();
      lastPinchRef.current = null;
      syncDrawingBlocked();
      resetView();
    }
  }, [zoomEnabled, resetView, syncDrawingBlocked]);

  const beginPinch = (viewport: HTMLElement) => {
    const pts = [...pointersRef.current.values()];
    const centerClient = pointerCenter(pts[0]!, pts[1]!);
    const distance = Math.max(
      pointerDistance(pts[0]!, pts[1]!),
      MIN_PINCH_DISTANCE,
    );
    lastPinchRef.current = {
      distance,
      center: viewportPointFromClient(centerClient.x, centerClient.y, viewport),
      zoom: zoomRef.current,
      pan: { ...panRef.current },
    };
  };

  const handlePointerDownCapture = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!zoomEnabled) return;

    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointersRef.current.size >= 2) {
      const viewport = viewportRef.current;
      if (pointersRef.current.size === 2 && viewport) {
        multiTouchSessionRef.current = true;
        onPinchStart?.();
        beginPinch(viewport);
      }
      event.preventDefault();
      event.stopPropagation();
    }

    syncDrawingBlocked();
  };

  const handlePointerMoveCapture = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!zoomEnabled || !pointersRef.current.has(event.pointerId)) return;

    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const last = lastPinchRef.current;
    if (pointersRef.current.size < 2 || !last) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    const pts = [...pointersRef.current.values()];
    const centerClient = pointerCenter(pts[0]!, pts[1]!);
    const currentCenter = viewportPointFromClient(
      centerClient.x,
      centerClient.y,
      viewport,
    );
    const currentDistance = pointerDistance(pts[0]!, pts[1]!);
    const content = getContentSize(viewport);
    const next = applyPinchStep(last, currentDistance, currentCenter, content);

    setZoom(next.zoom);
    setPan(next.pan);
    lastPinchRef.current = {
      distance: Math.max(currentDistance, MIN_PINCH_DISTANCE),
      center: currentCenter,
      zoom: next.zoom,
      pan: next.pan,
    };
    event.preventDefault();
    event.stopPropagation();
  };

  const endPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) {
      lastPinchRef.current = null;
    }
    if (pointersRef.current.size === 0) {
      multiTouchSessionRef.current = false;
    }
    syncDrawingBlocked();
  };

  const handlePointerUpCapture = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!zoomEnabled) return;
    endPointer(event);
  };

  const handlePointerCancelCapture = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!zoomEnabled) return;
    endPointer(event);
  };

  return (
    <div
      ref={viewportRef}
      className={`editor-canvas-viewport${zoomEnabled ? ' editor-canvas-viewport--zoomable' : ''}`}
      onPointerDownCapture={handlePointerDownCapture}
      onPointerMoveCapture={handlePointerMoveCapture}
      onPointerUpCapture={handlePointerUpCapture}
      onPointerCancelCapture={handlePointerCancelCapture}
      data-pinching={pointersRef.current.size >= 2 ? 'true' : undefined}
    >
      <div
        className="editor-canvas-transform"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {children}
      </div>
    </div>
  );
}
