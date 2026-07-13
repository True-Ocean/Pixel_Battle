import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  onlineRematchInsufficientPxHint,
  type OnlinePxBalanceSnapshot,
} from '../onlinePvp';
import { HelpInlinePxIcon } from './HelpInlineEconomy';

interface OnlinePvpBattleEndModalProps {
  open: boolean;
  won: boolean;
  rematchDisabled?: boolean;
  rematchButtonLabel?: string;
  showRematchButton?: boolean;
  /** 再戦希望・相手退出などの案内 */
  statusHint?: string | null;
  pxOutcome?: OnlinePxBalanceSnapshot | null;
  canRematch?: boolean;
  /** 相手退出後は退出ボタンを OK にする */
  leaveButtonLabel?: string;
  onRematch: () => void;
  onLeave: () => void;
}

export function OnlinePvpBattleEndModal({
  open,
  won,
  rematchDisabled = false,
  rematchButtonLabel = '再戦希望',
  showRematchButton = true,
  statusHint = null,
  pxOutcome = null,
  canRematch = true,
  leaveButtonLabel = 'ルームから退出',
  onRematch,
  onLeave,
}: OnlinePvpBattleEndModalProps) {
  useEffect(() => {
    if (!open) return;

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
  }, [open]);

  if (!open) return null;

  const insufficientPxHint =
    canRematch === false ? onlineRematchInsufficientPxHint(false) : undefined;
  const transfer = pxOutcome?.transfer ?? 0;
  const showPx = pxOutcome != null && transfer > 0;
  const gained = pxOutcome?.playerWon === true;

  return createPortal(
    <div className="graveyard-pick-backdrop">
      <div
        className="graveyard-pick-panel online-pvp-end-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="online-pvp-end-modal-result"
        aria-describedby={
          showPx
            ? 'online-pvp-end-modal-px'
            : statusHint
              ? 'online-pvp-end-modal-status'
              : undefined
        }
      >
        <p
          id="online-pvp-end-modal-result"
          className={`online-pvp-end-result online-pvp-end-result--${
            won ? 'win' : 'lose'
          }`}
        >
          {won ? 'WIN' : 'LOSE'}
        </p>
        {showPx ? (
          <p
            id="online-pvp-end-modal-px"
            className={`online-pvp-end-panel-px-reward${
              gained ? '' : ' online-pvp-end-panel-px-reward--loss'
            }`}
          >
            <span className="online-pvp-end-panel-px-reward-plus">
              {gained ? '+' : '−'}
            </span>
            <HelpInlinePxIcon />
            <span>
              {transfer.toLocaleString()}
              {gained ? 'ゲット！' : ''}
            </span>
          </p>
        ) : null}

        {statusHint ? (
          <p
            id="online-pvp-end-modal-status"
            className="online-pvp-end-panel-hint"
          >
            {statusHint}
          </p>
        ) : null}

        {insufficientPxHint ? (
          <p className="online-pvp-end-panel-hint muted">{insufficientPxHint}</p>
        ) : null}

        {showRematchButton ? (
          <button
            type="button"
            className="graveyard-pick-confirm"
            disabled={rematchDisabled}
            onClick={onRematch}
          >
            {rematchButtonLabel}
          </button>
        ) : null}
        <button
          type="button"
          className={`graveyard-pick-double-ad online-pvp-end-panel-leave${
            showRematchButton ? '' : ' online-pvp-end-panel-leave--solo'
          }`}
          onClick={onLeave}
        >
          {leaveButtonLabel}
        </button>
      </div>
    </div>,
    document.body,
  );
}

interface OnlinePvpLeaveConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function OnlinePvpLeaveConfirmDialog({
  open,
  onConfirm,
  onCancel,
}: OnlinePvpLeaveConfirmDialogProps) {
  if (!open) return null;

  return createPortal(
    <div className="confirm-dialog-backdrop" onClick={onCancel}>
      <div
        className="confirm-dialog online-pvp-leave-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="online-pvp-leave-confirm-title"
        aria-describedby="online-pvp-leave-confirm-message"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="online-pvp-leave-confirm-title" className="confirm-dialog-title">
          ルームから退出
        </h2>
        <div id="online-pvp-leave-confirm-message" className="confirm-dialog-message">
          <p className="confirm-dialog-message-line">ルームから退出しますか？</p>
        </div>
        <div className="confirm-dialog-actions">
          <button type="button" className="confirm-dialog-cancel" onClick={onCancel}>
            キャンセル
          </button>
          <button type="button" className="confirm-dialog-confirm" onClick={onConfirm}>
            退出する
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface OnlinePvpOpponentLeftModalProps {
  open: boolean;
  onAcknowledge: () => void;
}

export function OnlinePvpOpponentLeftModal({
  open,
  onAcknowledge,
}: OnlinePvpOpponentLeftModalProps) {
  if (!open) return null;

  return createPortal(
    <div className="confirm-dialog-backdrop">
      <div
        className="confirm-dialog online-pvp-opponent-left-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="online-pvp-opponent-left-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="online-pvp-opponent-left-title" className="confirm-dialog-title">
          相手がルームから退出しました
        </h2>
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="confirm-dialog-confirm confirm-dialog-confirm-primary"
            onClick={onAcknowledge}
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
