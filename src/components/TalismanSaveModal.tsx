import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Card } from '../types';
import { TalismanIcon } from './TalismanIcon';

interface TalismanSaveModalProps {
  card: Card;
  onConfirm: () => void;
}

export function TalismanSaveModal({ card, onConfirm }: TalismanSaveModalProps) {
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
    <div className="talisman-save-backdrop">
      <div
        className="talisman-save-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="talisman-save-title"
      >
        <h2 id="talisman-save-title" className="talisman-save-title">
          護符が効いた！
        </h2>
        <p className="talisman-save-icon-wrap" aria-hidden="true">
          <TalismanIcon className="talisman-save-icon" />
        </p>
        <p className="talisman-save-message">
          <strong>{card.name}</strong> に付けられた護符がロストを防ぎました。
        </p>
        <p className="talisman-save-note muted">護符は消えました。</p>
        <button type="button" className="talisman-save-confirm" onClick={onConfirm}>
          OK
        </button>
      </div>
    </div>,
    document.body,
  );
}
