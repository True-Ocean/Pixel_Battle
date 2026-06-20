import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getAttributeMeta } from '../config/attributes';
import { getUnlockedAttributes } from '../config/attributeUnlock';
import { applyAttributeChange } from '../card';
import {
  canAffordAttributeSelect,
  JEWEL_COST_ATTRIBUTE_SELECT,
} from '../config/economy';
import type { Attribute, Card } from '../types';
import type { AttributeSelectOutcome, AttributeSelectSuccess } from './attributeSelectTypes';
import { AttributeBadge } from './AttributeBadge';
import { EconomyBalanceChange } from './EconomyBalanceChange';
import { JewelAmount } from './JewelIcon';

type SelectPhase = 'pick' | 'done';

interface AttributeSelectModalProps {
  open: boolean;
  card: Card;
  userLevel: number;
  jewels: number;
  paletteShopUnlocks?: readonly number[];
  onClose: () => void;
  onSelect: (attribute: Attribute) => AttributeSelectOutcome;
}

export function AttributeSelectModal({
  open,
  card,
  userLevel,
  jewels,
  paletteShopUnlocks = [],
  onClose,
  onSelect,
}: AttributeSelectModalProps) {
  const unlocked = getUnlockedAttributes(userLevel);
  const initialAttributeRef = useRef(card.attribute);
  const [phase, setPhase] = useState<SelectPhase>('pick');
  const [selected, setSelected] = useState<Attribute>(card.attribute);
  const [selectResult, setSelectResult] = useState<AttributeSelectSuccess | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    initialAttributeRef.current = card.attribute;
    setPhase('pick');
    setSelected(card.attribute);
    setSelectResult(null);
    setError(null);
  }, [open, card.id]);

  if (!open) return null;

  const canAfford = canAffordAttributeSelect({ jewels });
  const attributeChanged = selected !== initialAttributeRef.current;
  const canConfirm = canAfford && attributeChanged;
  const previewBp = applyAttributeChange(
    card,
    selected,
    userLevel,
    paletteShopUnlocks,
  ).bp;
  const bpUnchanged = selected === initialAttributeRef.current || previewBp === card.bp;

  const handleConfirm = () => {
    if (!canConfirm) return;
    setError(null);
    const outcome = onSelect(selected);
    if (typeof outcome === 'string') {
      setError(outcome);
      return;
    }
    setSelectResult(outcome);
    setPhase('done');
  };

  const handleClose = () => {
    onClose();
  };

  const doneMeta = selectResult ? getAttributeMeta(selectResult.attribute) : null;
  const bpDelta =
    selectResult != null ? selectResult.newBp - selectResult.previousBp : 0;

  return createPortal(
    <div className="attribute-edit-backdrop" onClick={handleClose}>
      <div
        className={[
          'attribute-edit-panel',
          'attribute-select-panel',
          phase === 'done' ? 'attribute-select-panel--done' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attribute-select-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="attribute-select-title" className="attribute-edit-title">
          {phase === 'done' ? '属性セレクト完了' : '属性セレクト'}
        </h2>

        {phase === 'pick' && (
          <>
            <p className="attribute-edit-message muted">
              解放済みの属性から選択できます。
            </p>

            <div className="attribute-select-grid" role="listbox" aria-label="属性を選択">
              {unlocked.map((attribute) => {
                const isSelected = selected === attribute;
                const meta = getAttributeMeta(attribute);
                return (
                  <button
                    key={attribute}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    aria-label={meta.ariaName}
                    className={`attribute-select-option${
                      isSelected ? ' attribute-select-option--selected' : ''
                    }`}
                    onClick={() => setSelected(attribute)}
                  >
                    <AttributeBadge attribute={attribute} size="deck" />
                  </button>
                );
              })}
            </div>

            <p className="attribute-select-bp muted" aria-live="polite">
              {bpUnchanged
                ? `BP ${card.bp}（変更なし）`
                : `BP ${card.bp} → ${previewBp}`}
            </p>

            {error && (
              <p className="attribute-edit-error" role="alert">
                {error}
              </p>
            )}

            <div className="attribute-edit-actions attribute-edit-actions--equal">
              <button type="button" className="attribute-edit-cancel" onClick={handleClose}>
                キャンセル
              </button>
              <button
                type="button"
                className={`attribute-edit-confirm${canConfirm ? '' : ' attribute-edit-confirm--pending'}`}
                disabled={!canConfirm}
                onClick={handleConfirm}
              >
                <span>決定</span>
                <JewelAmount
                  amount={JEWEL_COST_ATTRIBUTE_SELECT}
                  className="attribute-edit-confirm-cost"
                  iconClassName="attribute-edit-confirm-icon"
                />
              </button>
            </div>
          </>
        )}

        {phase === 'done' && selectResult && doneMeta && (
          <div className="attribute-select-done">
            <div
              className="attribute-select-done-badge"
              aria-label={doneMeta.ariaName}
            >
              <AttributeBadge attribute={selectResult.attribute} size="deck" />
            </div>
            <p className="attribute-select-done-message">
              {doneMeta.ariaName}になりました！
            </p>
            <p
              className="limit-break-success-bp attribute-select-done-bp"
              aria-label={`BP ${selectResult.previousBp}から${selectResult.newBp}へ`}
            >
              <span className="attribute-select-done-bp-label">BP</span>
              <span className="limit-break-success-bp-prev">{selectResult.previousBp}</span>
              <span className="limit-break-success-bp-arrow" aria-hidden>
                →
              </span>
              <span className="limit-break-success-bp-next">{selectResult.newBp}</span>
              {bpDelta !== 0 && (
                <span
                  className={
                    bpDelta > 0
                      ? 'limit-break-success-bp-gain'
                      : 'editor-save-bp-delta-loss'
                  }
                >
                  ({bpDelta > 0 ? `+${bpDelta}` : bpDelta})
                </span>
              )}
            </p>
            <EconomyBalanceChange
              label="保有ジュエル"
              kind="jewel"
              previous={selectResult.previousJewels}
              next={selectResult.nextJewels}
            />
            <button
              type="button"
              className="attribute-edit-close-btn attribute-select-done-close"
              onClick={handleClose}
            >
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
