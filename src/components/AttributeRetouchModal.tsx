import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getAttributeMeta } from '../config/attributes';
import { getUnlockedAttributes } from '../config/attributeUnlock';
import {
  canAffordAttributeRetouch,
  PIXEL_COST_ATTRIBUTE_RETOUCH,
} from '../config/economy';
import type { Attribute } from '../types';
import { AttributeBadge } from './AttributeBadge';
import { EconomyBalanceChange } from './EconomyBalanceChange';
import { PixelCoinIcon } from './PixelCoinIcon';

type RetouchPhase = 'confirm' | 'spinning' | 'done';

export interface AttributeRetouchResult {
  attribute: Attribute;
  previousAttribute: Attribute;
  previousBp: number;
  newBp: number;
  previousFreePixels: number;
  nextFreePixels: number;
}

interface AttributeRetouchModalProps {
  open: boolean;
  userLevel: number;
  freePixels: number;
  onClose: () => void;
  onRetouch: () => AttributeRetouchResult | { error: string };
  onCommitRetouch: () => void;
}

export function AttributeRetouchModal({
  open,
  userLevel,
  freePixels,
  onClose,
  onRetouch,
  onCommitRetouch,
}: AttributeRetouchModalProps) {
  const [phase, setPhase] = useState<RetouchPhase>('confirm');
  const [error, setError] = useState<string | null>(null);
  const [displayAttribute, setDisplayAttribute] = useState<Attribute>('attack');
  const [result, setResult] = useState<AttributeRetouchResult | null>(null);
  const [retouchAgainError, setRetouchAgainError] = useState<string | null>(null);
  const spinTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      setPhase('confirm');
      setError(null);
      setResult(null);
      setRetouchAgainError(null);
      setDisplayAttribute('attack');
      if (spinTimerRef.current != null) {
        window.clearInterval(spinTimerRef.current);
        spinTimerRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current != null) {
        window.clearInterval(spinTimerRef.current);
      }
    };
  }, []);

  if (!open) return null;

  const canAfford = canAffordAttributeRetouch({ freePixels });
  const unlocked = getUnlockedAttributes(userLevel);

  const startSpin = (target: Attribute) => {
    setPhase('spinning');
    let tick = 0;
    const maxTicks = 18;
    spinTimerRef.current = window.setInterval(() => {
      tick += 1;
      const index = tick % unlocked.length;
      setDisplayAttribute(unlocked[index] ?? target);
      if (tick >= maxTicks) {
        if (spinTimerRef.current != null) {
          window.clearInterval(spinTimerRef.current);
          spinTimerRef.current = null;
        }
        setDisplayAttribute(target);
        onCommitRetouch();
        setPhase('done');
      }
    }, 90);
  };

  const runRetouch = (fromConfirm: boolean): boolean => {
    if (!canAffordAttributeRetouch({ freePixels })) return false;

    if (fromConfirm) {
      setError(null);
    } else {
      setRetouchAgainError(null);
    }

    const outcome = onRetouch();
    if ('error' in outcome) {
      if (fromConfirm) {
        setError(outcome.error);
      } else {
        setRetouchAgainError(outcome.error);
      }
      return false;
    }

    setResult(outcome);
    startSpin(outcome.attribute);
    return true;
  };

  const handleConfirm = () => {
    if (!canAfford) return;
    runRetouch(true);
  };

  const handleRetouchAgain = () => {
    if (!canAffordAttributeRetouch({ freePixels })) return;
    runRetouch(false);
  };

  const handleClose = () => {
    if (phase === 'spinning') return;
    onClose();
  };

  const phaseTitle =
    phase === 'confirm'
      ? '属性リタッチ'
      : phase === 'spinning'
        ? '属性リタッチ抽選中！'
        : '属性ゲット！';

  return createPortal(
    <div className="attribute-edit-backdrop" onClick={handleClose}>
      <div
        className={[
          'attribute-edit-panel',
          phase !== 'confirm' ? 'attribute-edit-panel--retouch-result' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attribute-retouch-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="attribute-retouch-title" className="attribute-edit-title">
          {phaseTitle}
        </h2>

        {phase === 'confirm' && (
          <>
            <p className="attribute-edit-message muted">
              これまでに解放された属性からランダムにリタッチします。
              同じ属性が出る場合もあります。よろしいですか？
            </p>
            {error && (
              <p className="attribute-edit-error" role="alert">
                {error}
              </p>
            )}
            <div className="attribute-edit-actions attribute-edit-actions--equal">
              <button
                type="button"
                className="attribute-edit-cancel"
                onClick={handleClose}
              >
                キャンセル
              </button>
              <button
                type="button"
                className={`attribute-edit-confirm${canAfford ? '' : ' attribute-edit-confirm--pending'}`}
                disabled={!canAfford}
                onClick={handleConfirm}
              >
                <span>リタッチ</span>
                <span className="attribute-edit-confirm-cost">
                  <PixelCoinIcon className="attribute-edit-confirm-icon" />
                  <span>{PIXEL_COST_ATTRIBUTE_RETOUCH.toLocaleString()}</span>
                </span>
              </button>
            </div>
          </>
        )}

        {(phase === 'spinning' || phase === 'done') && (
          <div className="attribute-retouch-result">
            <div
              className={`attribute-retouch-badge-wrap${
                phase === 'spinning' ? ' attribute-retouch-badge-wrap--spinning' : ''
              }`}
              aria-label={
                phase === 'done' && result
                  ? getAttributeMeta(result.attribute).ariaName
                  : '属性抽選中'
              }
            >
              <AttributeBadge attribute={displayAttribute} size="deck" />
            </div>
            {phase === 'done' && result && (
              <>
                <p className="attribute-retouch-bp muted">
                  BP {result.previousBp} → {result.newBp}
                </p>
                <EconomyBalanceChange
                  label="保有コイン"
                  kind="px"
                  previous={result.previousFreePixels}
                  next={result.nextFreePixels}
                />
                {retouchAgainError && (
                  <p className="attribute-edit-error" role="alert">
                    {retouchAgainError}
                  </p>
                )}
                <div className="attribute-retouch-done-actions">
                  <button
                    type="button"
                    className={`attribute-edit-confirm attribute-retouch-again-btn${
                      canAfford ? '' : ' attribute-edit-confirm--pending'
                    }`}
                    disabled={!canAfford}
                    onClick={handleRetouchAgain}
                  >
                    <span>もう一度リタッチ</span>
                    <span className="attribute-edit-confirm-cost">
                      <PixelCoinIcon className="attribute-edit-confirm-icon" />
                      <span>{PIXEL_COST_ATTRIBUTE_RETOUCH.toLocaleString()}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="attribute-edit-close-btn attribute-retouch-close-btn"
                    onClick={handleClose}
                  >
                    閉じる
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
