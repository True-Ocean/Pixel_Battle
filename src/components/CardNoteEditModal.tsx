import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  formatCardUserNoteLimitLabel,
  sanitizeCardUserNoteInput,
} from '../card/cardNoteInput';

interface CardNoteEditModalProps {
  initialValue: string;
  onSave: (value: string) => void;
  onClose: () => void;
}

export function CardNoteEditModal({
  initialValue,
  onSave,
  onClose,
}: CardNoteEditModalProps) {
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [noteInput, setNoteInput] = useState(initialValue);

  useEffect(() => {
    setNoteInput(initialValue);
  }, [initialValue]);

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
    textareaRef.current?.focus({ preventScroll: true });

    return () => {
      style.position = prev.position;
      style.top = prev.top;
      style.width = prev.width;
      style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, []);

  const handleSave = () => {
    onSave(noteInput);
    onClose();
  };

  return createPortal(
    <div className="card-note-backdrop" onClick={onClose}>
      <div
        className="card-note-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-note-edit-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="card-note-edit-title" className="card-note-title">
          カードノート
        </h2>
        <p className="card-note-message muted">
          このカードに関するメモを入力しましょう。空欄のままにするとノートは削除されます。
          <span className="card-note-limit-label">
            （{formatCardUserNoteLimitLabel()}・改行可）
          </span>
        </p>
        <label className="card-note-label" htmlFor={textareaId}>
          ノート
        </label>
        <textarea
          ref={textareaRef}
          id={textareaId}
          className="card-note-textarea"
          rows={5}
          value={noteInput}
          placeholder="例：対戦相手の弱点属性メモ"
          onChange={(event) =>
            setNoteInput(sanitizeCardUserNoteInput(event.target.value))
          }
        />
        <p className="card-note-hint muted">
          元のカード編集画面の保存ボタンで確定します。
        </p>
        <div className="card-note-actions">
          <button type="button" className="card-note-cancel" onClick={onClose}>
            キャンセル
          </button>
          <button type="button" className="card-note-save" onClick={handleSave}>
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
