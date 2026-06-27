import { useEffect, useRef, useState, type ReactNode } from 'react';
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

type RetouchPhase = 'confirm' | 'spinning' | 'confirmed' | 'done';

const SPIN_INTERVAL_MS = 90;
const SPIN_TICKS = 18;
const CONFIRMED_DELAY_MS = 1400;

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
  onRetouch: () => AttributeRetouchResult | { error: ReactNode };
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
  const [error, setError] = useState<ReactNode>(null);
  const [displayAttribute, setDisplayAttribute] = useState<Attribute>('attack');
  const [result, setResult] = useState<AttributeRetouchResult | null>(null);
  const [retouchAgainError, setRetouchAgainError] = useState<ReactNode>(null);
  const spinTimerRef = useRef<number | null>(null);
  const confirmedTimerRef = useRef<number | null>(null);

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
      if (confirmedTimerRef.current != null) {
        window.clearTimeout(confirmedTimerRef.current);
        confirmedTimerRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    if (phase !== 'confirmed') return;

    confirmedTimerRef.current = window.setTimeout(() => {
      confirmedTimerRef.current = null;
      setPhase('done');
    }, CONFIRMED_DELAY_MS);

    return () => {
      if (confirmedTimerRef.current != null) {
        window.clearTimeout(confirmedTimerRef.current);
        confirmedTimerRef.current = null;
      }
    };
  }, [phase]);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current != null) {
        window.clearInterval(spinTimerRef.current);
      }
      if (confirmedTimerRef.current != null) {
        window.clearTimeout(confirmedTimerRef.current);
      }
    };
  }, []);

  if (!open) return null;

  const canAfford = canAffordAttributeRetouch({ freePixels });
  const unlocked = getUnlockedAttributes(userLevel);

  const startSpin = (target: Attribute) => {
    setPhase('spinning');
    let tick = 0;
    spinTimerRef.current = window.setInterval(() => {
      tick += 1;
      const index = tick % unlocked.length;
      setDisplayAttribute(unlocked[index] ?? target);
      if (tick >= SPIN_TICKS) {
        if (spinTimerRef.current != null) {
          window.clearInterval(spinTimerRef.current);
          spinTimerRef.current = null;
        }
        setDisplayAttribute(target);
        onCommitRetouch();
        setPhase('confirmed');
      }
    }, SPIN_INTERVAL_MS);
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
    if (phase === 'spinning' || phase === 'confirmed') return;
    onClose();
  };

  const confirmedMeta =
    result != null ? getAttributeMeta(result.attribute) : null;

  const phaseTitle =
    phase === 'confirm'
      ? '属性リタッチ'
      : phase === 'spinning'
        ? '属性リタッチ抽選中！'
        : phase === 'confirmed' && confirmedMeta
          ? `${confirmedMeta.ariaName}に決定！`
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
        aria-live={phase === 'spinning' || phase === 'confirmed' ? 'polite' : undefined}
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

        {(phase === 'spinning' || phase === 'confirmed' || phase === 'done') && (
          <div className="attribute-retouch-result">
            <div
              className={[
                'attribute-retouch-badge-wrap',
                'attribute-create-roulette-badge-wrap',
                phase === 'spinning'
                  ? 'attribute-retouch-badge-wrap--spinning'
                  : phase === 'confirmed'
                    ? 'attribute-create-roulette-badge-wrap--confirmed'
                    : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={
                phase !== 'spinning' && result
                  ? getAttributeMeta(result.attribute).ariaName
                  : '属性抽選中'
              }
            >
              <AttributeBadge attribute={displayAttribute} size="deck" />
              {phase === 'confirmed' && (
                <span className="attribute-create-roulette-glow" aria-hidden />
              )}
            </div>
            {phase === 'confirmed' && confirmedMeta && (
              <p className="attribute-create-roulette-confirmed muted">
                {confirmedMeta.label}（{confirmedMeta.ariaName}）が適用されました
              </p>
            )}
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
