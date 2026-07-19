import { useCallback, useEffect, useRef, useState } from 'react';
import {
  cloneGrid,
  createEmptyGrid,
  resizeGridCentered,
} from '../canvas';
import {
  applyRedo,
  applyUndo,
  pushEditorHistory,
  snapshotsEqual,
  type EditorSnapshot,
} from '../canvas/editorHistory';
import { MAX_USER_LEVEL } from '../config/balance';
import type { BrushSizeId } from '../config/brushSize';
import {
  CANVAS_SIZE_MIN,
  getSelectableCanvasSizes,
} from '../config/canvasUnlock';
import { EDITOR_SHOP_UNLOCK_IDS } from '../config/editorShop';
import type { EditorToolId } from '../config/editorTools';
import { PALETTE_16 } from '../config/palette';
import type { PixelGrid, UserProfile } from '../types';
import { createFullPaletteShopUnlocks } from '../user/paletteShop';
import { CanvasSizePicker } from './CanvasSizePicker';
import { CardPreview } from './CardPreview';
import { ColorPalette } from './ColorPalette';
import { ConfirmDialog } from './ConfirmDialog';
import { EditorCanvasViewport } from './EditorCanvasViewport';
import { PixelCanvas, type PixelCanvasHandle } from './PixelCanvas';
import { ToolStrip } from './ToolStrip';

export interface AvatarEditorScreenProps {
  avatar?: UserProfile['avatar'];
  onBack: () => void;
  onSave: (avatar: NonNullable<UserProfile['avatar']>) => void;
}

/** アバター編集は全ツール・全パレット解放（既存ユーザーの解放状態は変更しない） */
const AVATAR_UNLOCK_LEVEL = MAX_USER_LEVEL;
const AVATAR_PALETTE_UNLOCKS = createFullPaletteShopUnlocks();
const AVATAR_EDITOR_UNLOCKS = [...EDITOR_SHOP_UNLOCK_IDS];
const AVATAR_SELECTABLE_SIZES = getSelectableCanvasSizes(
  AVATAR_UNLOCK_LEVEL,
  CANVAS_SIZE_MIN,
);
const MINI_PREVIEW_SIZE = 48;

function hasPaintedCell(pixels: PixelGrid): boolean {
  for (const row of pixels) {
    for (const cell of row) {
      if (cell != null) return true;
    }
  }
  return false;
}

export function AvatarEditorScreen({
  avatar,
  onBack,
  onSave,
}: AvatarEditorScreenProps) {
  const isEditing = avatar != null;
  const initialSize = avatar?.canvasSize ?? CANVAS_SIZE_MIN;

  const [canvasSize, setCanvasSize] = useState(initialSize);
  const [pixels, setPixels] = useState(() =>
    avatar ? cloneGrid(avatar.pixels) : createEmptyGrid(initialSize),
  );
  const [editorHistory, setEditorHistory] = useState<EditorSnapshot[]>([]);
  const [editorFuture, setEditorFuture] = useState<EditorSnapshot[]>([]);
  const [brushColor, setBrushColor] = useState<string>(PALETTE_16[0]!);
  const [brushSize, setBrushSize] = useState<BrushSizeId>('small');
  const [tool, setTool] = useState<EditorToolId>('pen');
  const [error, setError] = useState<string | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  const blockDrawingRef = useRef(false);
  const pixelCanvasRef = useRef<PixelCanvasHandle>(null);
  const initialSnapshotRef = useRef<EditorSnapshot>({
    pixels: avatar ? cloneGrid(avatar.pixels) : createEmptyGrid(initialSize),
    canvasSize: initialSize,
  });
  const editorSnapshotRef = useRef<EditorSnapshot>({ pixels, canvasSize });
  const editorHistoryRef = useRef<EditorSnapshot[]>(editorHistory);
  const editorFutureRef = useRef<EditorSnapshot[]>(editorFuture);

  useEffect(() => {
    editorSnapshotRef.current = { pixels, canvasSize };
    editorHistoryRef.current = editorHistory;
    editorFutureRef.current = editorFuture;
  }, [pixels, canvasSize, editorHistory, editorFuture]);

  const applyEditorChange = useCallback(
    (next: Partial<EditorSnapshot> & { pixels: PixelGrid }) => {
      const current = editorSnapshotRef.current;
      const target: EditorSnapshot = {
        pixels: next.pixels,
        canvasSize: next.canvasSize ?? current.canvasSize,
      };
      if (snapshotsEqual(current, target)) return;

      const nextPast = pushEditorHistory(editorHistoryRef.current, current);
      editorHistoryRef.current = nextPast;
      editorFutureRef.current = [];
      setEditorHistory(nextPast);
      setEditorFuture([]);
      const nextPixels = cloneGrid(target.pixels);
      editorSnapshotRef.current = {
        pixels: nextPixels,
        canvasSize: target.canvasSize,
      };
      if (target.canvasSize !== current.canvasSize) {
        setCanvasSize(target.canvasSize);
      }
      setPixels(nextPixels);
    },
    [],
  );

  const handleUndo = useCallback(() => {
    const result = applyUndo(
      {
        past: editorHistoryRef.current,
        future: editorFutureRef.current,
      },
      editorSnapshotRef.current,
    );
    if (!result.next) return;

    editorHistoryRef.current = result.past;
    editorFutureRef.current = result.future;
    setEditorHistory(result.past);
    setEditorFuture(result.future);
    setCanvasSize(result.next.canvasSize);
    setPixels(cloneGrid(result.next.pixels));
  }, []);

  const handleRedo = useCallback(() => {
    const result = applyRedo(
      {
        past: editorHistoryRef.current,
        future: editorFutureRef.current,
      },
      editorSnapshotRef.current,
    );
    if (!result.next) return;

    editorHistoryRef.current = result.past;
    editorFutureRef.current = result.future;
    setEditorHistory(result.past);
    setEditorFuture(result.future);
    setCanvasSize(result.next.canvasSize);
    setPixels(cloneGrid(result.next.pixels));
  }, []);

  const handlePickColor = useCallback((color: string | null) => {
    if (color == null) {
      setTool('eraser');
      return;
    }
    setBrushColor(color);
    setTool('pen');
  }, []);

  const handleCanvasSizeChange = (nextSize: number) => {
    if (!AVATAR_SELECTABLE_SIZES.includes(nextSize)) return;
    const current = editorSnapshotRef.current;
    if (nextSize === current.canvasSize) return;
    applyEditorChange({
      pixels: resizeGridCentered(current.pixels, nextSize),
      canvasSize: nextSize,
    });
  };

  const handleSave = () => {
    if (!hasPaintedCell(pixels)) {
      setError('1マス以上塗ってください');
      return;
    }
    setError(null);
    onSave({
      pixels: cloneGrid(pixels),
      canvasSize,
    });
  };

  const handleBackRequest = () => {
    if (
      !snapshotsEqual(editorSnapshotRef.current, initialSnapshotRef.current)
    ) {
      setDiscardConfirmOpen(true);
      return;
    }
    onBack();
  };

  return (
    <section className="screen editor-screen avatar-editor-screen">
      <header className="editor-header avatar-editor-header">
        <div className="editor-header-title-row avatar-editor-header-title-row">
          <h1>{isEditing ? 'アバター編集' : 'アバター作成'}</h1>
        </div>
      </header>

      <div className="editor-body avatar-editor-body">
        <div className="editor-image-area avatar-editor-image-area">
          <div className="editor-canvas-meta-row avatar-editor-canvas-meta-row">
            <CanvasSizePicker
              selectedSize={canvasSize}
              selectableSizes={AVATAR_SELECTABLE_SIZES}
              onSelectSize={handleCanvasSizeChange}
            />
            <div
              className="editor-screen-mini-preview"
              style={{
                width: MINI_PREVIEW_SIZE,
                height: MINI_PREVIEW_SIZE,
              }}
              aria-hidden
            >
              <CardPreview pixels={pixels} />
            </div>
          </div>

          <div className="editor-workspace avatar-editor-workspace">
            <ToolStrip
              tool={tool}
              userLevel={AVATAR_UNLOCK_LEVEL}
              editorShopUnlocks={AVATAR_EDITOR_UNLOCKS}
              canUndo={editorHistory.length > 0}
              canRedo={editorFuture.length > 0}
              onSelectTool={setTool}
              onClear={() =>
                applyEditorChange({ pixels: createEmptyGrid(canvasSize) })
              }
              onUndo={handleUndo}
              onRedo={handleRedo}
              brushSize={brushSize}
              onBrushSizeChange={setBrushSize}
              onRequestFeatureUnlock={() => {}}
            />
            <div className="editor-canvas-column avatar-editor-canvas-column">
              <div className="editor-canvas-wrap avatar-editor-canvas-wrap">
                <EditorCanvasViewport
                  zoomEnabled
                  blockDrawingRef={blockDrawingRef}
                  onPinchStart={() => pixelCanvasRef.current?.cancelInteraction()}
                >
                  <PixelCanvas
                    ref={pixelCanvasRef}
                    pixels={pixels}
                    onChange={(next) => applyEditorChange({ pixels: next })}
                    onPickColor={handlePickColor}
                    onFillComplete={() => setTool('pen')}
                    tool={tool}
                    brushColor={brushColor}
                    brushSize={brushSize}
                    blockDrawingRef={blockDrawingRef}
                  />
                </EditorCanvasViewport>
              </div>
              <ColorPalette
                brushColor={brushColor}
                userLevel={AVATAR_UNLOCK_LEVEL}
                shopUnlocks={AVATAR_PALETTE_UNLOCKS}
                onSelectColor={setBrushColor}
              />
            </div>
          </div>
        </div>

        {error && <p className="error editor-error avatar-editor-error">{error}</p>}
      </div>

      <div className="editor-footer avatar-editor-footer">
        <button
          type="button"
          className="primary editor-save avatar-editor-save"
          onClick={handleSave}
        >
          <span className="editor-save-label">保存</span>
        </button>
        <button
          type="button"
          className="editor-back-deck avatar-editor-back"
          onClick={handleBackRequest}
        >
          戻る
        </button>
      </div>

      <ConfirmDialog
        open={discardConfirmOpen}
        title="編集をやめる"
        message="保存していない変更は失われます。よろしいですか？"
        confirmLabel="編集をやめる"
        cancelLabel="編集を継続"
        confirmVariant="danger"
        onConfirm={() => {
          setDiscardConfirmOpen(false);
          onBack();
        }}
        onCancel={() => setDiscardConfirmOpen(false)}
      />
    </section>
  );
}
