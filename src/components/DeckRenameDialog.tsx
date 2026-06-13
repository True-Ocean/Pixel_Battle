import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DECK_NAME_MAX_LENGTH } from '../config/balance';
import { getDeckDisplayName, sanitizeDeckNameInput } from '../deckSlots';

interface DeckRenameDialogProps {
  deckIndex: number;
  deckNames?: string[];
  onSave: (deckIndex: number, name: string) => void;
  onClose: () => void;
}

export function DeckRenameDialog({
  deckIndex,
  deckNames,
  onSave,
  onClose,
}: DeckRenameDialogProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const defaultLabel = `デッキ${deckIndex + 1}`;
  const currentCustomName = deckNames?.[deckIndex]?.trim() ?? '';
  const [nameInput, setNameInput] = useState(currentCustomName);

  useEffect(() => {
    setNameInput(currentCustomName);
  }, [currentCustomName, deckIndex]);

  useEffect(() => {
    const scrollY = window.scrollY;
    const { style } = document.body;
    const prev = {
      position: style.position,
      top: style.top,
      width: style.width,
      overflow: style.overflow,
    };

    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.width = '100%';
    style.overflow = 'hidden';
    inputRef.current?.focus({ preventScroll: true });
    inputRef.current?.select();

    return () => {
      style.position = prev.position;
      style.top = prev.top;
      style.width = prev.width;
      style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, []);

  const handleSave = () => {
    onSave(deckIndex, sanitizeDeckNameInput(nameInput));
    onClose();
  };

  return createPortal(
    <div className="deck-rename-backdrop" onClick={onClose}>
      <div
        className="deck-rename-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deck-rename-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="deck-rename-title" className="deck-rename-title">
          デッキ名を変更
        </h2>
        <p className="deck-rename-message muted">
          {getDeckDisplayName(deckIndex, deckNames)} の名前を入力してください。空欄にすると
          {defaultLabel} 表示に戻ります。
        </p>
        <label className="deck-rename-label" htmlFor={inputId}>
          デッキ名
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className="deck-rename-input"
          maxLength={DECK_NAME_MAX_LENGTH}
          placeholder={defaultLabel}
          value={nameInput}
          onChange={(event) => setNameInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleSave();
            }
          }}
        />
        <div className="deck-rename-actions">
          <button type="button" className="deck-rename-cancel" onClick={onClose}>
            キャンセル
          </button>
          <button type="button" className="deck-rename-save" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
