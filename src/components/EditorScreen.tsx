import { useState } from 'react';
import { createEmptyGrid } from '../canvas';
import { CANVAS_SIZE, DECK_MAX } from '../config/balance';
import { PALETTE_16 } from '../config/palette';
import {
  CardCreationError,
  computeColorRatios,
  createCardFromDrawing,
  updateCardFromDrawing,
} from '../card';
import { getUnlockedPaletteCount } from '../config/paletteUnlock';
import type { Card, PixelGrid } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { PalettePicker, PixelCanvas, type EditorTool } from './PixelCanvas';

interface EditorScreenProps {
  deckCount: number;
  userLevel?: number;
  editTarget?: Card | null;
  onBack: () => void;
  onCreated: (card: Card) => void;
  onUpdated?: (card: Card) => void;
}

function cloneGrid(pixels: Card['pixels']) {
  return pixels.map((row) => [...row]);
}

function validateDrawing(name: string, pixels: PixelGrid): string | null {
  if (!name.trim()) {
    return 'カード名を入力してください';
  }
  const ratios = computeColorRatios(pixels, CANVAS_SIZE * CANVAS_SIZE);
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
  const [name, setName] = useState(() => editTarget?.name ?? '');
  const [pixels, setPixels] = useState(() =>
    editTarget ? cloneGrid(editTarget.pixels) : createEmptyGrid(),
  );
  const [brushColor, setBrushColor] = useState<string>(PALETTE_16[0]);
  const [tool, setTool] = useState<EditorTool>('paint');
  const [error, setError] = useState<string | null>(null);
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);

  const persistCard = () => {
    setError(null);
    if (!isEditing && deckCount >= DECK_MAX) {
      setError(`デッキは最大 ${DECK_MAX} 枚です`);
      return;
    }
    try {
      if (isEditing && editTarget) {
        const card = updateCardFromDrawing(editTarget, name, pixels);
        onUpdated?.(card);
      } else {
        const card = createCardFromDrawing(name, pixels, {
          unlockedPaletteCount: getUnlockedPaletteCount(userLevel),
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
          <PalettePicker
            tool={tool}
            brushColor={brushColor}
            onSelectColor={(color) => {
              setBrushColor(color);
              setTool('paint');
            }}
            onSelectTool={setTool}
            onClear={() => setPixels(createEmptyGrid())}
          />

          <div className="editor-canvas-wrap">
            <PixelCanvas
              pixels={pixels}
              onChange={setPixels}
              tool={tool}
              brushColor={brushColor}
            />
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
            あなたが描いたイメージとカード名から、カードのステータスが自動生成されるよ
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
