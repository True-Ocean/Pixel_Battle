import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  finalizeCardNameForCreation,
  sanitizeCardNameInput,
  validateCardNameForCreation,
} from '../card';
import {
  JEWEL_COST_RENAME,
  PIXEL_COST_RENAME_FIRST,
  canAffordCardRename,
  isFirstCardRename,
} from '../config/economy';
import { JewelAmount } from './JewelIcon';
import { PixelCoinIcon } from './PixelCoinIcon';

interface CardRenameDialogProps {
  currentName: string;
  renameCount: number;
  freePixels: number;
  jewels: number;
  onSave: (newName: string) => string | null;
  onClose: () => void;
}

export function CardRenameDialog({
  currentName,
  renameCount,
  freePixels,
  jewels,
  onSave,
  onClose,
}: CardRenameDialogProps) {
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const [nameInput, setNameInput] = useState(currentName);
  const [nameError, setNameError] = useState<string | null>(null);
  const isFirstRename = isFirstCardRename(renameCount);
  const canAfford = canAffordCardRename({ freePixels, jewels }, renameCount);

  useEffect(() => {
    setNameInput(currentName);
    setNameError(null);
  }, [currentName]);

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
    if (isComposingRef.current) return;

    const validationError = validateCardNameForCreation(nameInput);
    if (validationError) {
      setNameError(validationError);
      return;
    }
    const nextName = finalizeCardNameForCreation(nameInput);
    if (nextName === currentName.trim()) {
      setNameError('現在と異なる名前を入力してください。');
      return;
    }
    const error = onSave(nextName);
    if (error) {
      setNameError(error);
      return;
    }
    onClose();
  };

  return createPortal(
    <div className="deck-rename-backdrop" onClick={onClose}>
      <div
        className="deck-rename-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-rename-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="card-rename-title" className="deck-rename-title">
          カード名を変更
        </h2>
        <p className="deck-rename-message muted">
          新しいカード名を入力してください（全角10文字まで）。
        </p>
        <label className="deck-rename-label" htmlFor={inputId}>
          カード名
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className={`deck-rename-input${nameError ? ' deck-rename-input--error' : ''}`}
          value={nameInput}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? errorId : undefined}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={(event) => {
            isComposingRef.current = false;
            setNameInput(sanitizeCardNameInput(event.currentTarget.value));
            if (nameError) setNameError(null);
          }}
          onChange={(event) => {
            if (isComposingRef.current) {
              setNameInput(event.target.value);
              return;
            }
            setNameInput(sanitizeCardNameInput(event.target.value));
            if (nameError) setNameError(null);
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
          <button
            type="button"
            className="deck-rename-save card-rename-confirm-btn"
            disabled={!canAfford}
            onClick={handleSave}
          >
            <span className="card-rename-confirm-label">リネーム</span>
            {isFirstRename ? (
              <span className="card-rename-confirm-cost">
                <PixelCoinIcon className="card-rename-confirm-icon" />
                <span>{PIXEL_COST_RENAME_FIRST.toLocaleString()}</span>
              </span>
            ) : (
              <JewelAmount
                amount={JEWEL_COST_RENAME}
                className="card-rename-confirm-cost"
                iconClassName="card-rename-confirm-icon"
              />
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
