import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CardNoteIcon } from './CardNoteIcon';

interface CardNoteViewModalProps {
  cardName: string;
  userNote: string;
  onClose: () => void;
}

export function CardNoteViewModal({
  cardName,
  userNote,
  onClose,
}: CardNoteViewModalProps) {
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

    return () => {
      style.position = prev.position;
      style.top = prev.top;
      style.width = prev.width;
      style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, []);

  return createPortal(
    <div className="card-note-backdrop" onClick={onClose}>
      <div
        className="card-note-panel card-note-panel--view"
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-note-view-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="card-note-view-header">
          <CardNoteIcon className="card-note-view-header-icon" filled />
          <h2 id="card-note-view-title" className="card-note-view-title">
            {cardName}
          </h2>
        </div>
        <div className="card-note-view-body" role="note">
          {userNote}
        </div>
        <div className="card-note-actions card-note-actions--single">
          <button type="button" className="card-note-save" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
