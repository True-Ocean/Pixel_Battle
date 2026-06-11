import { useCallback, useRef, useState } from 'react';
import { cloneGrid, createEmptyGrid, gridSize, resizeGrid } from '../canvas';
import {
  applyRedo,
  applyUndo,
  pushEditorHistory,
  snapshotsEqual,
  type EditorSnapshot,
} from '../canvas/editorHistory';
import { DECK_MAX } from '../config/balance';
import { PALETTE_16 } from '../config/palette';
import {
  getDefaultCanvasSize,
  getUnlockedCanvasSizes,
  isCanvasSizeUnlocked,
  type CanvasSize,
} from '../config/canvasUnlock';
import {
  CardCreationError,
  computeColorRatios,
  createCardFromDrawing,
  updateCardFromDrawing,
} from '../card';
import { getUnlockedPaletteCount } from '../config/paletteUnlock';
import type { Card, PixelGrid } from '../types';
import { CanvasSizePicker } from './CanvasSizePicker';
import { CardPreview } from './CardPreview';
import { ColorPalette } from './ColorPalette';
import { ConfirmDialog } from './ConfirmDialog';
import type { EditorToolId } from '../config/editorTools';
import { PixelCanvas } from './PixelCanvas';
import { ToolStrip } from './ToolStrip';

interface EditorScreenProps {
  deckCount: number;
  userLevel?: number;
  editTarget?: Card | null;
  onBack: () => void;
  onCreated: (card: Card) => void;
  onUpdated?: (card: Card) => void;
}

const MINI_PREVIEW_SIZE = 48;

function validateDrawing(name: string, pixels: PixelGrid): string | null {
  if (!name.trim()) {
    return 'カード名を入力してください';
  }
  const size = gridSize(pixels);
  const ratios = computeColorRatios(pixels, size * size);
  if (!ratios) {
    return '1マス以上塗ってください';
  }
  return null;
}

export function EditorScreen({
  deckCount,
  userLevel = 1,
  editTarget = null,
  onBack,
  onCreated,
  onUpdated,
}: EditorScreenProps) {
  const isEditing = editTarget != null;
  const unlockedCanvasSizes = getUnlockedCanvasSizes(userLevel);
  const editCanvasSize = editTarget?.canvasSize ?? gridSize(editTarget?.pixels ?? []);

  const [name, setName] = useState(() => editTarget?.name ?? '');
  const [canvasSize, setCanvasSize] = useState<CanvasSize>(() => {
    if (isEditing && editTarget) {
      return editCanvasSize as CanvasSize;
    }
    return getDefaultCanvasSize(userLevel);
  });
  const [pixels, setPixels] = useState(() =>
    editTarget ? cloneGrid(editTarget.pixels) : createEmptyGrid(canvasSize),
  );
  const [editorHistory, setEditorHistory] = useState<EditorSnapshot[]>([]);
  const [editorFuture, setEditorFuture] = useState<EditorSnapshot[]>([]);
  const [brushColor, setBrushColor] = useState<string>(PALETTE_16[0]);
  const [tool, setTool] = useState<EditorToolId>('pen');
  const [error, setError] = useState<string | null>(null);
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  const editorSnapshotRef = useRef<EditorSnapshot>({ pixels, canvasSize });
  const editorHistoryRef = useRef<EditorSnapshot[]>(editorHistory);
  const editorFutureRef = useRef<EditorSnapshot[]>(editorFuture);

  editorSnapshotRef.current = { pixels, canvasSize };
  editorHistoryRef.current = editorHistory;
  editorFutureRef.current = editorFuture;

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
      if (target.canvasSize !== current.canvasSize) {
        setCanvasSize(target.canvasSize as CanvasSize);
      }
      setPixels(cloneGrid(target.pixels));
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
    setCanvasSize(result.next.canvasSize as CanvasSize);
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
    setCanvasSize(result.next.canvasSize as CanvasSize);
    setPixels(cloneGrid(result.next.pixels));
  }, []);

  const handleCanvasSizeChange = (nextSize: CanvasSize) => {
    if (isEditing) return;
    if (!isCanvasSizeUnlocked(nextSize, userLevel)) return;
    applyEditorChange({
      pixels: resizeGrid(editorSnapshotRef.current.pixels, nextSize),
      canvasSize: nextSize,
    });
  };

  const persistCard = () => {
    setError(null);
    if (!isEditing && deckCount >= DECK_MAX) {
      setError(`デッキは最大 ${DECK_MAX} 枚です`);
      return;
    }
    try {
      if (isEditing && editTarget) {
        const card = updateCardFromDrawing(
          editTarget,
          name,
          pixels,
          userLevel,
          getUnlockedPaletteCount(userLevel),
        );
        onUpdated?.(card);
      } else {
        const card = createCardFromDrawing(name, pixels, {
          userLevel,
          unlockedPaletteCount: getUnlockedPaletteCount(userLevel),
          canvasSize,
        });
        onCreated(card);
      }
      onBack();
    } catch (e) {
      setError(e instanceof CardCreationError ? e.message : '保存に失敗しました');
    }
  };

  const handleCreateRequest = () => {
    const validationError = validateDrawing(name, pixels);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (deckCount >= DECK_MAX) {
      setError(`デッキは最大 ${DECK_MAX} 枚です`);
      return;
    }
    setError(null);
    setConfirmCreateOpen(true);
  };

  const handleSave = () => {
    const validationError = validateDrawing(name, pixels);
    if (validationError) {
      setError(validationError);
      return;
    }
    persistCard();
  };

  return (
    <section className="screen editor-screen">
      <header className="editor-header">
        <h1>{isEditing ? 'カード編集' : 'イメージ作成'}</h1>
      </header>

      <div className="editor-body">
        <div className="editor-image-area">
          <div className="editor-canvas-meta-row">
            <CanvasSizePicker
              selectedSize={canvasSize}
              unlockedSizes={unlockedCanvasSizes}
              onSelectSize={handleCanvasSizeChange}
              disabled={isEditing}
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

          <div className="editor-workspace">
            <ToolStrip
              tool={tool}
              userLevel={userLevel}
              canUndo={editorHistory.length > 0}
              canRedo={editorFuture.length > 0}
              onSelectTool={setTool}
              onClear={() =>
                applyEditorChange({ pixels: createEmptyGrid(canvasSize) })
              }
              onUndo={handleUndo}
              onRedo={handleRedo}
            />
            <div className="editor-canvas-column">
              <div className="editor-canvas-wrap">
                <PixelCanvas
                  pixels={pixels}
                  onChange={(next) => applyEditorChange({ pixels: next })}
                  onPickColor={handlePickColor}
                  tool={tool}
                  brushColor={brushColor}
                />
              </div>
              <ColorPalette
                brushColor={brushColor}
                userLevel={userLevel}
                onSelectColor={setBrushColor}
              />
            </div>
          </div>
        </div>

        <div className="editor-name-section">
          <label className="field editor-field">
            <span>カード名</span>
            <input
              type="text"
              value={name}
              maxLength={32}
              placeholder="例：ほのおの剣"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <p className="muted editor-name-hint">
            あなたが描いたイメージとカード名から、カードが自動生成されます
          </p>
        </div>

        {error && <p className="error editor-error">{error}</p>}
      </div>

      <div className="editor-footer">
        <button
          type="button"
          className="primary editor-save"
          onClick={isEditing ? handleSave : handleCreateRequest}
        >
          {isEditing ? '保存' : 'カード作成'}
        </button>
        <button type="button" className="editor-back-deck" onClick={onBack}>
          マイデッキに戻る
        </button>
      </div>

      {!isEditing && (
        <ConfirmDialog
          open={confirmCreateOpen}
          title="カードを作成しますか？"
          message="このイメージと名前でカードを作成します。よろしいですか？"
          confirmLabel="作成する"
          cancelLabel="キャンセル"
          confirmVariant="primary"
          onConfirm={() => {
            setConfirmCreateOpen(false);
            persistCard();
          }}
          onCancel={() => setConfirmCreateOpen(false)}
        />
      )}
    </section>
  );
}
