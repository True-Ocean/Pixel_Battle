import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cloneGrid, createEmptyGrid, gridSize, resizeGrid, upscaleGridToFit } from '../canvas';
import {
  applyRedo,
  applyUndo,
  pushEditorHistory,
  snapshotsEqual,
  type EditorSnapshot,
} from '../canvas/editorHistory';
import { ATTRIBUTE_META } from '../config/attributes';
import { DECK_MAX } from '../config/balance';
import { PALETTE_16 } from '../config/palette';
import {
  CANVAS_SIZE_MIN,
  getDefaultCanvasSize,
  getSelectableCanvasSizes,
  isCanvasSizeUnlocked,
} from '../config/canvasUnlock';
import {
  CardCreationError,
  computeColorRatios,
  createCardFromDrawing,
  finalizeCardNameForCreation,
  rollAttribute,
  sanitizeCardNameInput,
  updateCardFromDrawing,
  validateCardNameForCreation,
  applyUserNoteToCard,
  finalizeCardUserNote,
} from '../card';
import { AttributeCreateRouletteModal } from './AttributeCreateRouletteModal';
import { getEditorHelp } from '../config/helpContent';
import { HelpInfoButton } from './HelpInfoButton';
import { HelpPanelModal } from './HelpPanelModal';
import {
  buildUnlockedColorSet,
  isPaletteColorUnlocked,
} from '../config/paletteUnlock';
import type { Attribute, Card, PixelGrid } from '../types';
import { CanvasSizePicker } from './CanvasSizePicker';
import { CardPreview } from './CardPreview';
import { ColorPalette } from './ColorPalette';
import { ConfirmDialog } from './ConfirmDialog';
import { inlinePxShortageError } from './HelpInlineEconomy';
import { EditorFeatureUnlockModal } from './EditorFeatureUnlockModal';
import { EditorCanvasViewport } from './EditorCanvasViewport';
import { EditorSaveBpConfirmModal } from './EditorSaveBpConfirmModal';
import { PaletteUnlockModal } from './PaletteUnlockModal';
import {
  calcEditorSaveCharges,
  canAffordEditorSave,
  getEditorSaveTotalPixelCost,
} from '../config/economy';
import type { BrushSizeId } from '../config/brushSize';
import {
  isEditorFeatureUnlocked,
  isEditorToolAvailable,
  type EditorShopUnlockId,
} from '../config/editorShop';
import {
  isEditorToolImplemented,
  type EditorToolId,
} from '../config/editorTools';
import { PixelCanvas, type PixelCanvasHandle } from './PixelCanvas';
import { ToolStrip } from './ToolStrip';
import { PixelCoinIcon } from './PixelCoinIcon';
import { CardNoteEditModal } from './CardNoteEditModal';
import { CardNoteIconButton } from './CardNoteIconButton';

interface EditorScreenProps {
  deckCount: number;
  userLevel?: number;
  editTarget?: Card | null;
  freePixels?: number;
  jewels?: number;
  paletteShopUnlocks?: readonly number[];
  editorShopUnlocks?: readonly EditorShopUnlockId[];
  backLabel?: string;
  onBack: () => void;
  onCreated: (card: Card) => void;
  onUpdated?: (
    card: Card,
    options?: {
      saveCharges: ReturnType<typeof calcEditorSaveCharges>;
      nameChanged: boolean;
    },
  ) => void;
  onUnlockPaletteWithJewels?: (index: number) => string | null;
  onUnlockEditorFeatureWithJewels?: (feature: EditorShopUnlockId) => string | null;
}

const MINI_PREVIEW_SIZE = 48;
const DEV_MODE = import.meta.env.DEV;

const DEV_ATTRIBUTE_OPTIONS = (
  Object.keys(ATTRIBUTE_META) as Attribute[]
).map((attribute) => ({
  attribute,
  label: ATTRIBUTE_META[attribute].label,
  ariaName: ATTRIBUTE_META[attribute].ariaName,
}));

function validateDrawing(
  name: string,
  pixels: PixelGrid,
  userLevel: number,
  shopUnlocks: readonly number[],
): string | null {
  if (!name.trim()) {
    return 'カード名を入力してください';
  }
  const size = gridSize(pixels);
  const ratios = computeColorRatios(
    pixels,
    size * size,
    buildUnlockedColorSet(userLevel, shopUnlocks),
  );
  if (!ratios) {
    return '1マス以上塗ってください';
  }
  return null;
}

export function EditorScreen({
  deckCount,
  userLevel = 1,
  editTarget = null,
  freePixels = 0,
  jewels = 0,
  paletteShopUnlocks = [],
  editorShopUnlocks = [],
  backLabel = 'マイデッキに戻る',
  onBack,
  onCreated,
  onUpdated,
  onUnlockPaletteWithJewels,
  onUnlockEditorFeatureWithJewels,
}: EditorScreenProps) {
  const isEditing = editTarget != null;
  const editCanvasSize = editTarget?.canvasSize ?? gridSize(editTarget?.pixels ?? []);
  const maxCanvasSize = getDefaultCanvasSize(userLevel);
  const selectableCanvasSizes = getSelectableCanvasSizes(
    userLevel,
    isEditing ? editCanvasSize : CANVAS_SIZE_MIN,
  );

  const [name, setName] = useState(() => editTarget?.name ?? '');
  const [userNote, setUserNote] = useState(() => editTarget?.userNote ?? '');
  const [canvasSize, setCanvasSize] = useState<number>(() => {
    if (isEditing && editTarget) {
      return editCanvasSize;
    }
    return maxCanvasSize;
  });
  const [pixels, setPixels] = useState(() =>
    editTarget ? cloneGrid(editTarget.pixels) : createEmptyGrid(canvasSize),
  );
  const [editorHistory, setEditorHistory] = useState<EditorSnapshot[]>([]);
  const [editorFuture, setEditorFuture] = useState<EditorSnapshot[]>([]);
  const [brushColor, setBrushColor] = useState<string>(PALETTE_16[0]);
  const [brushSize, setBrushSize] = useState<BrushSizeId>('small');
  const [tool, setTool] = useState<EditorToolId>('pen');
  const blockDrawingRef = useRef(false);
  const pixelCanvasRef = useRef<PixelCanvasHandle>(null);
  const [error, setError] = useState<ReactNode>(null);
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  const [pendingCreateAttribute, setPendingCreateAttribute] =
    useState<Attribute | null>(null);
  const [saveConfirmPending, setSaveConfirmPending] = useState<{
    card: Card;
    cardName: string;
    previousBp: number;
    nextBp: number;
    previousFreePixels: number;
    nextFreePixels: number;
    previousJewels: number;
    nextJewels: number;
    saveCharges: ReturnType<typeof calcEditorSaveCharges>;
    nameChanged: boolean;
  } | null>(null);
  const [canvasUpgradeOpen, setCanvasUpgradeOpen] = useState(false);
  const [paletteUnlockIndex, setPaletteUnlockIndex] = useState<number | null>(
    null,
  );
  const [featureUnlockId, setFeatureUnlockId] =
    useState<EditorShopUnlockId | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [noteEditOpen, setNoteEditOpen] = useState(false);
  const [pendingCanvasUpgradeSize, setPendingCanvasUpgradeSize] =
    useState<number | null>(null);
  const isComposingNameRef = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [devForceAttribute, setDevForceAttribute] = useState<Attribute | null>(
    null,
  );
  const editorSnapshotRef = useRef<EditorSnapshot>({ pixels, canvasSize });
  const editorHistoryRef = useRef<EditorSnapshot[]>(editorHistory);
  const editorFutureRef = useRef<EditorSnapshot[]>(editorFuture);
  const originalEditSnapshotRef = useRef<EditorSnapshot | null>(
    isEditing && editTarget
      ? {
          pixels: cloneGrid(editTarget.pixels),
          canvasSize: editCanvasSize,
        }
      : null,
  );

  editorSnapshotRef.current = { pixels, canvasSize };
  editorHistoryRef.current = editorHistory;
  editorFutureRef.current = editorFuture;

  useEffect(() => {
    if (!isPaletteColorUnlocked(brushColor, userLevel, paletteShopUnlocks)) {
      setBrushColor(PALETTE_16[0]!);
    }
  }, [userLevel, brushColor, paletteShopUnlocks]);

  useEffect(() => {
    if (
      !isEditorToolImplemented(tool) ||
      !isEditorToolAvailable(tool, userLevel, editorShopUnlocks)
    ) {
      setTool('pen');
    }
  }, [userLevel, tool, editorShopUnlocks]);

  const brushSizeUnlocked = isEditorFeatureUnlocked(
    'brushSize',
    userLevel,
    editorShopUnlocks,
  );
  const effectiveBrushSize = brushSizeUnlocked ? brushSize : 'small';
  const zoomFeatureUnlocked = isEditorFeatureUnlocked(
    'zoom',
    userLevel,
    editorShopUnlocks,
  );

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
    setCanvasSize(result.next.canvasSize);
    setPixels(cloneGrid(result.next.pixels));
  }, []);

  const handleCanvasSizeChange = (nextSize: number) => {
    if (!isCanvasSizeUnlocked(nextSize, userLevel)) return;

    const currentSize = editorSnapshotRef.current.canvasSize;
    if (nextSize === currentSize) return;

    if (isEditing) {
      if (nextSize < editCanvasSize) return;

      if (nextSize === editCanvasSize && currentSize > editCanvasSize) {
        const baseline = originalEditSnapshotRef.current;
        if (baseline) {
          applyEditorChange({
            pixels: cloneGrid(baseline.pixels),
            canvasSize: baseline.canvasSize,
          });
        }
        return;
      }

      if (nextSize < currentSize && nextSize > editCanvasSize) {
        const baseline = originalEditSnapshotRef.current;
        if (baseline) {
          applyEditorChange({
            pixels: cloneGrid(baseline.pixels),
            canvasSize: baseline.canvasSize,
          });
        }
        setPendingCanvasUpgradeSize(nextSize);
        setCanvasUpgradeOpen(true);
        return;
      }

      if (nextSize > currentSize) {
        setPendingCanvasUpgradeSize(nextSize);
        setCanvasUpgradeOpen(true);
        return;
      }

      return;
    }

    applyEditorChange({
      pixels: resizeGrid(editorSnapshotRef.current.pixels, nextSize),
      canvasSize: nextSize,
    });
  };

  const handleConfirmCanvasUpgrade = () => {
    if (pendingCanvasUpgradeSize == null) return;
    applyEditorChange({
      pixels: upscaleGridToFit(
        editorSnapshotRef.current.pixels,
        pendingCanvasUpgradeSize,
      ),
      canvasSize: pendingCanvasUpgradeSize,
    });
    setCanvasUpgradeOpen(false);
    setPendingCanvasUpgradeSize(null);
  };

  const handleCancelCanvasUpgrade = () => {
    setCanvasUpgradeOpen(false);
    setPendingCanvasUpgradeSize(null);
  };

  const applyCardNameInput = useCallback((raw: string) => {
    setName(sanitizeCardNameInput(raw));
  }, []);

  const persistCard = (forceAttribute?: Attribute) => {
    setError(null);
    if (!isEditing && deckCount >= DECK_MAX) {
      setError(`デッキは最大 ${DECK_MAX} 枚です`);
      return;
    }
    try {
      if (isEditing && editTarget) {
        const card = applyUserNoteToCard(
          updateCardFromDrawing(
            editTarget,
            name,
            pixels,
            userLevel,
            { paletteShopUnlocks },
          ),
          userNote,
        );
        onUpdated?.(card);
      } else {
        const nameError = validateCardNameForCreation(name);
        if (nameError) {
          setError(nameError);
          return;
        }
        const card = applyUserNoteToCard(
          createCardFromDrawing(name, pixels, {
            userLevel,
            paletteShopUnlocks,
            canvasSize,
            ...(forceAttribute ? { forceAttribute } : {}),
          }),
          userNote,
        );
        onCreated(card);
      }
      onBack();
    } catch (e) {
      setError(e instanceof CardCreationError ? e.message : '保存に失敗しました');
    }
  };

  const startCreateRoulette = () => {
    const nameError = validateCardNameForCreation(name);
    if (nameError) {
      setError(nameError);
      return;
    }
    const attribute =
      DEV_MODE && devForceAttribute
        ? devForceAttribute
        : rollAttribute(userLevel);
    setPendingCreateAttribute(attribute);
  };

  const handleCreateRouletteComplete = () => {
    const attribute = pendingCreateAttribute;
    setPendingCreateAttribute(null);
    if (attribute == null) return;
    persistCard(attribute);
  };

  const handleCreateRequest = () => {
    const nameError = validateCardNameForCreation(name);
    if (nameError) {
      setError(nameError);
      return;
    }
    const validationError = validateDrawing(name, pixels, userLevel, paletteShopUnlocks);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (deckCount >= DECK_MAX) {
      setError(`デッキは最大 ${DECK_MAX} 枚です`);
      return;
    }
    setError(null);
    nameInputRef.current?.blur();
    setConfirmCreateOpen(true);
  };

  const handleSave = () => {
    if (!editTarget) return;
    const nameError = validateCardNameForCreation(name);
    if (nameError) {
      setError(nameError);
      return;
    }
    const validationError = validateDrawing(name, pixels, userLevel, paletteShopUnlocks);
    if (validationError) {
      setError(validationError);
      return;
    }

    const originalName = finalizeCardNameForCreation(editTarget.name);
    const pendingName = finalizeCardNameForCreation(name);
    const nameChanged = pendingName !== originalName;
    const saveCharges = calcEditorSaveCharges({
      nameChanged,
      editCanvasSize,
      pendingCanvasSize: canvasSize,
    });

    if (!canAffordEditorSave({ freePixels }, saveCharges)) {
      const totalPx = getEditorSaveTotalPixelCost(saveCharges);
      setError(inlinePxShortageError(totalPx));
      return;
    }

    setError(null);
    try {
      const previousBp = editTarget.bp;
      const card = applyUserNoteToCard(
        updateCardFromDrawing(
          editTarget,
          name,
          pixels,
          userLevel,
          { paletteShopUnlocks },
        ),
        userNote,
      );
      const spentPx = getEditorSaveTotalPixelCost(saveCharges);
      setSaveConfirmPending({
        card,
        cardName: card.name,
        previousBp,
        nextBp: card.bp,
        previousFreePixels: freePixels,
        nextFreePixels: freePixels - spentPx,
        previousJewels: jewels,
        nextJewels: jewels,
        saveCharges,
        nameChanged,
      });
    } catch (e) {
      setError(e instanceof CardCreationError ? e.message : '保存に失敗しました');
    }
  };

  const handleSaveConfirm = () => {
    if (!saveConfirmPending) return;
    const { card, saveCharges, nameChanged } = saveConfirmPending;
    setSaveConfirmPending(null);
    onUpdated?.(card, { saveCharges, nameChanged });
    onBack();
  };

  const handleSaveCancel = () => {
    setSaveConfirmPending(null);
  };

  const originalName =
    editTarget != null ? finalizeCardNameForCreation(editTarget.name) : '';
  const pendingName = finalizeCardNameForCreation(name);
  const nameChanged = isEditing && pendingName !== originalName;
  const saveCharges = isEditing
    ? calcEditorSaveCharges({
        nameChanged,
        editCanvasSize,
        pendingCanvasSize: canvasSize,
      })
    : null;
  const canvasUpgradePx = saveCharges?.canvasUpgradePx ?? 0;
  const renamePixelCost = saveCharges?.renamePixelCost ?? 0;
  const canAffordSave =
    !isEditing ||
    !saveCharges ||
    canAffordEditorSave({ freePixels }, saveCharges);
  const noteFilled = finalizeCardUserNote(userNote) != null;

  return (
    <section className="screen editor-screen">
      <header className="editor-header">
        <div className="editor-header-title-row">
          <h1>{isEditing ? 'カード編集' : 'イメージ作成'}</h1>
          <HelpInfoButton
            className="editor-help-btn"
            ariaLabel={isEditing ? 'カード編集のヘルプ' : 'イメージ作成のヘルプ'}
            onClick={() => setHelpOpen(true)}
          />
        </div>
      </header>

      <div className="editor-body">
        <div className="editor-image-area">
          <div className="editor-canvas-meta-row">
            <CanvasSizePicker
              selectedSize={canvasSize}
              selectableSizes={selectableCanvasSizes}
              onSelectSize={handleCanvasSizeChange}
              disabled={isEditing && selectableCanvasSizes.length <= 1}
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
              editorShopUnlocks={editorShopUnlocks}
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
              onRequestFeatureUnlock={setFeatureUnlockId}
            />
            <div className="editor-canvas-column">
              <div className="editor-canvas-wrap">
                <EditorCanvasViewport
                  zoomEnabled={zoomFeatureUnlocked}
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
                    brushSize={effectiveBrushSize}
                    blockDrawingRef={blockDrawingRef}
                  />
                </EditorCanvasViewport>
              </div>
              <ColorPalette
                brushColor={brushColor}
                userLevel={userLevel}
                shopUnlocks={paletteShopUnlocks}
                onSelectColor={setBrushColor}
                onRequestShopUnlock={setPaletteUnlockIndex}
              />
            </div>
          </div>
        </div>

        <div className="editor-name-section">
          <label className="field editor-field">
            <span className="editor-field-label">
              カード名
              <span className="editor-name-limit-note">（全角10文字まで）</span>
            </span>
            <div className="editor-name-row">
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                placeholder="例：ほのおの剣"
                readOnly={
                  confirmCreateOpen ||
                  pendingCreateAttribute != null ||
                  saveConfirmPending != null
                }
                onCompositionStart={() => {
                  isComposingNameRef.current = true;
                }}
                onCompositionEnd={(event) => {
                  isComposingNameRef.current = false;
                  applyCardNameInput(event.currentTarget.value);
                }}
                onChange={(e) => {
                  if (isComposingNameRef.current) {
                    setName(e.target.value);
                    return;
                  }
                  applyCardNameInput(e.target.value);
                }}
                onBlur={(e) => {
                  applyCardNameInput(e.target.value);
                }}
              />
              <CardNoteIconButton
                filled={noteFilled}
                ariaLabel={
                  noteFilled ? 'カードノートを編集' : 'カードノートを追加'
                }
                onClick={() => setNoteEditOpen(true)}
              />
            </div>
          </label>
          {DEV_MODE && !isEditing && (
            <label className="field editor-field editor-dev-attribute">
              <span>開発用: 属性指定</span>
              <select
                className="editor-dev-attribute-select"
                value={devForceAttribute ?? ''}
                onChange={(event) => {
                  const value = event.target.value;
                  setDevForceAttribute(
                    value === '' ? null : (value as Attribute),
                  );
                }}
              >
                <option value="">自動（通常抽選）</option>
                {DEV_ATTRIBUTE_OPTIONS.map(({ attribute, label, ariaName }) => (
                  <option key={attribute} value={attribute}>
                    {label}（{ariaName}）
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="muted editor-name-hint">
            {isEditing
              ? 'サイズ拡大・編集・リネーム・ノートは保存ボタンで確定します'
              : 'あなたが描いたイメージとカード名から、カードが自動生成されます'}
          </p>
        </div>

        {error && <p className="error editor-error">{error}</p>}
      </div>

      <div className="editor-footer">
        <button
          type="button"
          className={`primary editor-save${
            isEditing && !canAffordSave ? ' editor-save--pending' : ''
          }`}
          disabled={isEditing && !canAffordSave}
          onClick={isEditing ? handleSave : handleCreateRequest}
        >
          <span className="editor-save-label">{isEditing ? '保存' : 'カード作成'}</span>
          {isEditing && canvasUpgradePx > 0 && (
            <span className="editor-save-cost editor-save-cost--group">
              <span className="editor-save-cost-kind">拡大</span>
              <PixelCoinIcon className="editor-save-cost-icon" />
              <span>{canvasUpgradePx.toLocaleString()}</span>
            </span>
          )}
          {isEditing && renamePixelCost > 0 && (
            <span className="editor-save-cost editor-save-cost--group">
              <span className="editor-save-cost-kind">リネーム</span>
              <PixelCoinIcon className="editor-save-cost-icon" />
              <span>{renamePixelCost.toLocaleString()}</span>
            </span>
          )}
        </button>
        <button type="button" className="editor-back-deck" onClick={onBack}>
          {backLabel}
        </button>
      </div>

      {saveConfirmPending != null && (
        <EditorSaveBpConfirmModal
          cardName={saveConfirmPending.cardName}
          previousBp={saveConfirmPending.previousBp}
          nextBp={saveConfirmPending.nextBp}
          previousFreePixels={saveConfirmPending.previousFreePixels}
          nextFreePixels={saveConfirmPending.nextFreePixels}
          previousJewels={saveConfirmPending.previousJewels}
          nextJewels={saveConfirmPending.nextJewels}
          onConfirm={handleSaveConfirm}
          onCancel={handleSaveCancel}
        />
      )}
      {canvasUpgradeOpen && pendingCanvasUpgradeSize != null && (
        <ConfirmDialog
          open={canvasUpgradeOpen}
          title="キャンバスサイズ拡大"
          message={
            <>
              {editCanvasSize}×{editCanvasSize} から{' '}
              {pendingCanvasUpgradeSize}×{pendingCanvasUpgradeSize}{' '}
              に拡大します。
              <br />
              イメージは新しいサイズに合わせて適度にフィットされます。
              <br />
              保存する前であれば、サイズ選択から元のサイズに戻せます。
              <br />
              拡大した画像を保存すると、元のサイズには戻せません。
            </>
          }
          confirmLabel="拡大する"
          cancelLabel="キャンセル"
          confirmVariant="primary"
          onConfirm={handleConfirmCanvasUpgrade}
          onCancel={handleCancelCanvasUpgrade}
        />
      )}
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
            startCreateRoulette();
          }}
          onCancel={() => setConfirmCreateOpen(false)}
        />
      )}
      {pendingCreateAttribute != null && (
        <AttributeCreateRouletteModal
          open
          userLevel={userLevel}
          targetAttribute={pendingCreateAttribute}
          onComplete={handleCreateRouletteComplete}
        />
      )}
      {paletteUnlockIndex != null && (
        <PaletteUnlockModal
          paletteIndex={paletteUnlockIndex}
          userLevel={userLevel}
          jewels={jewels}
          shopUnlocks={paletteShopUnlocks}
          onClose={() => setPaletteUnlockIndex(null)}
          onUnlockWithJewels={(index) => {
            const error = onUnlockPaletteWithJewels?.(index) ?? null;
            if (!error) setPaletteUnlockIndex(null);
            return error;
          }}
        />
      )}
      {featureUnlockId != null && (
        <EditorFeatureUnlockModal
          feature={featureUnlockId}
          userLevel={userLevel}
          jewels={jewels}
          shopUnlocks={editorShopUnlocks}
          onClose={() => setFeatureUnlockId(null)}
          onUnlockWithJewels={(feature) =>
            onUnlockEditorFeatureWithJewels?.(feature) ?? null
          }
        />
      )}
      {helpOpen && (
        <HelpPanelModal
          topic={getEditorHelp(isEditing)}
          onClose={() => setHelpOpen(false)}
        />
      )}
      {noteEditOpen && (
        <CardNoteEditModal
          initialValue={userNote}
          onSave={setUserNote}
          onClose={() => setNoteEditOpen(false)}
        />
      )}
    </section>
  );
}
