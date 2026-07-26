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
            思い出アルバムに移動
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
  onRequestExpand: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

export function MemoryAlbumFullDialog({
  open,
  cardName,
  jewelCost,
  canAffordUnlock,
  onRequestExpand,
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
            onClick={onRequestExpand}
          >
            <span>アルバム拡張</span>
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

export const MEMORY_ALBUM_MOVE_CONFIRM_MESSAGE =
  'アルバムに移動すると、デッキに戻すことはできなくなります。よろしいですか？';

interface MemoryAlbumExpandOfferDialogProps {
  open: boolean;
  jewelCost: number;
  canAfford: boolean;
  onRequestExpand: () => void;
  onCancel: () => void;
}

/** アルバム拡張の最初のモーダル（コスト表示付き） */
export function MemoryAlbumExpandOfferDialog({
  open,
  jewelCost,
  canAfford,
  onRequestExpand,
  onCancel,
}: MemoryAlbumExpandOfferDialogProps) {
  if (!open) return null;

  return createPortal(
    <div className="confirm-dialog-backdrop" onClick={onCancel}>
      <div
        className="confirm-dialog memory-album-expand-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="memory-album-expand-offer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="memory-album-expand-offer-title"
          className="confirm-dialog-title memory-album-expand-dialog-title"
        >
          アルバム拡張
        </h2>
        {!canAfford && (
          <p className="confirm-dialog-message">ジュエルが不足しています。</p>
        )}
        <div className="memory-album-expand-offer-actions">
          <button
            type="button"
            className="deck-unlock-confirm-btn"
            disabled={!canAfford}
            aria-label={`アルバム拡張、ジュエル ${jewelCost.toLocaleString()}`}
            onClick={onRequestExpand}
          >
            <span>拡張する</span>
            <JewelAmount
              amount={jewelCost}
              className="memory-album-expand-confirm-cost"
              iconClassName="memory-album-expand-confirm-jewel"
            />
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

interface MemoryAlbumExpandConfirmDialogProps {
  open: boolean;
  jewelCost: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/** アルバム拡張の最終確認（誤タップ防止） */
export function MemoryAlbumExpandConfirmDialog({
  open,
  jewelCost,
  onConfirm,
  onCancel,
}: MemoryAlbumExpandConfirmDialogProps) {
  if (!open) return null;

  return createPortal(
    <div className="confirm-dialog-backdrop" onClick={onCancel}>
      <div
        className="confirm-dialog memory-album-expand-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="memory-album-expand-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="memory-album-expand-title"
          className="confirm-dialog-title memory-album-expand-dialog-title"
        >
          アルバム拡張
        </h2>
        <p
          className="confirm-dialog-message"
          aria-label={`ジュエル ${jewelCost.toLocaleString()}を使ってアルバムを拡張します。よろしいですか？`}
        >
          <JewelAmount
            amount={jewelCost}
            className="confirm-dialog-jewel-amount"
            iconClassName="confirm-dialog-jewel-icon"
          />
          を使ってアルバムを拡張します。
          <br />
          よろしいですか？
        </p>
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="confirm-dialog-confirm confirm-dialog-confirm-primary"
            onClick={onConfirm}
          >
            拡張する
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
