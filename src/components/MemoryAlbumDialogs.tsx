import { createPortal } from 'react-dom';
import { JewelAmount } from './JewelIcon';

interface CardDeckDispositionDialogProps {
  open: boolean;
  cardName: string;
  onDelete: () => void;
  onAddToAlbum: () => void;
  onCancel: () => void;
}

export function CardDeckDispositionDialog({
  open,
  cardName,
  onDelete,
  onAddToAlbum,
  onCancel,
}: CardDeckDispositionDialogProps) {
  if (!open) return null;

  return createPortal(
    <div className="confirm-dialog-backdrop" onClick={onCancel}>
      <div
        className="confirm-dialog card-deck-disposition-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-deck-disposition-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="card-deck-disposition-title" className="confirm-dialog-title">
          「{cardName}」をどうしますか？
        </h2>
        <p className="confirm-dialog-message muted">
          デッキから外す方法を選んでください。
        </p>
        <div className="card-deck-disposition-actions">
          <button
            type="button"
            className="confirm-dialog-cancel card-deck-disposition-album"
            onClick={onAddToAlbum}
          >
            思い出アルバムに保存
          </button>
          <button
            type="button"
            className="confirm-dialog-confirm card-deck-disposition-delete"
            onClick={onDelete}
          >
            削除する
          </button>
          <button
            type="button"
            className="confirm-dialog-cancel"
            onClick={onCancel}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface MemoryAlbumFullDialogProps {
  open: boolean;
  cardName: string;
  jewelCost: number;
  canAffordUnlock: boolean;
  onUnlockRow: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function MemoryAlbumFullDialog({
  open,
  cardName,
  jewelCost,
  canAffordUnlock,
  onUnlockRow,
  onDelete,
  onCancel,
}: MemoryAlbumFullDialogProps) {
  if (!open) return null;

  return createPortal(
    <div className="confirm-dialog-backdrop" onClick={onCancel}>
      <div
        className="confirm-dialog memory-album-full-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="memory-album-full-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="memory-album-full-title" className="confirm-dialog-title">
          アルバムが満杯です
        </h2>
        <p className="confirm-dialog-message">
          「{cardName}」をアルバムに保存する枠がありません。
        </p>
        <div className="memory-album-full-actions">
          <button
            type="button"
            className={`memory-album-full-unlock${canAffordUnlock ? '' : ' memory-album-full-unlock--pending'}`}
            disabled={!canAffordUnlock}
            onClick={onUnlockRow}
          >
            <span>行を解放する</span>
            <JewelAmount
              amount={jewelCost}
              className="memory-album-full-unlock-jewel"
              iconClassName="memory-album-full-unlock-jewel-icon"
            />
          </button>
          <button
            type="button"
            className="confirm-dialog-confirm memory-album-full-delete"
            onClick={onDelete}
          >
            削除する
          </button>
          <button type="button" className="confirm-dialog-cancel" onClick={onCancel}>
            キャンセル
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export const MEMORY_ALBUM_SAVE_CONFIRM_MESSAGE =
  'アルバムに保存すると、デッキに戻すことはできなくなり、閲覧のみ可能となります。よろしいですか？';
