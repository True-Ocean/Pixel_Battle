import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  className?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '削除',
  cancelLabel = 'キャンセル',
  confirmVariant = 'danger',
  className,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  const dialogClassName = ['confirm-dialog', className].filter(Boolean).join(' ');

  return createPortal(
    <div className="confirm-dialog-backdrop" onClick={onCancel}>
      <div
        className={dialogClassName}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="confirm-dialog-title">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="confirm-dialog-message">
          {message}
        </p>
        <div className="confirm-dialog-actions">
          <button type="button" className="confirm-dialog-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={
              confirmVariant === 'primary'
                ? 'confirm-dialog-confirm confirm-dialog-confirm-primary'
                : 'confirm-dialog-confirm'
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
