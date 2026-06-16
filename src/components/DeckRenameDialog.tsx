import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DECK_NAME_MAX_LENGTH } from '../config/balance';
import { getDeckDisplayName, isDeckNameTakenByOtherDeck, sanitizeDeckNameInput } from '../deckSlots';

interface DeckRenameDialogProps {
  deckIndex: number;
  deckNames?: string[];
  unlockedDeckCount: number;
  onSave: (deckIndex: number, name: string) => void;
  onClose: () => void;
}

export function DeckRenameDialog({
  deckIndex,
  deckNames,
  unlockedDeckCount,
  onSave,
  onClose,
}: DeckRenameDialogProps) {
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const defaultLabel = `デッキ${deckIndex + 1}`;
  const currentCustomName = deckNames?.[deckIndex]?.trim() ?? '';
  const [nameInput, setNameInput] = useState(currentCustomName);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    setNameInput(currentCustomName);
    setNameError(null);
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
    if (
      isDeckNameTakenByOtherDeck(
        deckNames,
        deckIndex,
        nameInput,
        unlockedDeckCount,
      )
    ) {
      setNameError('この名前は他のデッキで使われています。');
      return;
    }
    onSave(deckIndex, sanitizeDeckNameInput(nameInput));
    onClose();
  };

  const handleInputChange = (value: string) => {
    setNameInput(value);
    if (nameError) setNameError(null);
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
          className={`deck-rename-input${nameError ? ' deck-rename-input--error' : ''}`}
          maxLength={DECK_NAME_MAX_LENGTH}
          placeholder={defaultLabel}
          value={nameInput}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? errorId : undefined}
          onChange={(event) => handleInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleSave();
            }
          }}
        />
        {nameError && (
          <p id={errorId} className="deck-rename-error" role="alert">
            {nameError}
          </p>
        )}
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
