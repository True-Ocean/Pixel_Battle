import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  canPurchaseEditorFeature,
  EDITOR_FEATURE_LABELS,
  EDITOR_FEATURE_UNLOCK_LEVEL,
  isEditorFeatureUnlockedAtLevel,
  JEWEL_COST_EDITOR_EARLY_UNLOCK,
  type EditorShopUnlockId,
} from '../config/editorShop';
import { canAffordPaletteShopJewels } from '../config/economy';
import { JewelAmount, JewelIcon } from './JewelIcon';

function EditorShopFeatureIcon({ feature }: { feature: EditorShopUnlockId }) {
  switch (feature) {
    case 'undo':
      return (
        <span className="palette-undo-icon" aria-hidden>
          ↩
        </span>
      );
    case 'redo':
      return (
        <span className="palette-redo-icon" aria-hidden>
          ↪
        </span>
      );
    case 'line':
      return <span className="palette-line-icon" aria-hidden />;
    case 'rectangle':
      return <span className="palette-rectangle-icon" aria-hidden />;
    case 'circle':
      return <span className="palette-circle-icon" aria-hidden />;
    case 'move':
      return <span className="palette-move-icon" aria-hidden />;
    case 'copy':
      return <span className="palette-selection-icon" aria-hidden />;
    case 'brushSize':
      return (
        <span
          className="brush-size-tool-dot brush-size-tool-dot--medium"
          aria-hidden
        />
      );
    case 'zoom':
      return (
        <span className="palette-zoom-icon" aria-hidden>
          ⌕
        </span>
      );
    default:
      return null;
  }
}

interface EditorFeatureUnlockModalProps {
  feature: EditorShopUnlockId;
  userLevel: number;
  jewels: number;
  shopUnlocks: readonly EditorShopUnlockId[];
  onClose: () => void;
  onUnlockWithJewels: (feature: EditorShopUnlockId) => string | null;
}

export function EditorFeatureUnlockModal({
  feature,
  userLevel,
  jewels,
  shopUnlocks,
  onClose,
  onUnlockWithJewels,
}: EditorFeatureUnlockModalProps) {
  const [error, setError] = useState<string | null>(null);
  const label = EDITOR_FEATURE_LABELS[feature];
  const unlockLevel = EDITOR_FEATURE_UNLOCK_LEVEL[feature];
  const canPurchase = canPurchaseEditorFeature(feature, userLevel, shopUnlocks);
  const canAffordJewels = canAffordPaletteShopJewels(
    { jewels },
    JEWEL_COST_EDITOR_EARLY_UNLOCK,
  );

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

  const handleUnlock = () => {
    if (!canPurchase || !canAffordJewels) return;
    const message = onUnlockWithJewels(feature);
    if (message) setError(message);
    else onClose();
  };

  return createPortal(
    <div className="deck-unlock-backdrop" onClick={onClose}>
      <div
        className={`deck-unlock-panel palette-unlock-panel editor-feature-unlock-panel--compact${canPurchase ? ' deck-unlock-panel--ready' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-feature-unlock-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          id="editor-feature-unlock-title"
          className="editor-feature-unlock-heading"
        >
          <span className="editor-feature-unlock-icon-box" aria-hidden>
            <EditorShopFeatureIcon feature={feature} />
          </span>
          <p className="editor-feature-unlock-name">{label}ツール</p>
        </div>
        {canPurchase ? (
          <p className="deck-unlock-message editor-feature-unlock-message">
            <span className="editor-feature-unlock-message-line">
              <span className="editor-feature-unlock-jewel-inline" aria-hidden>
                <JewelIcon className="editor-feature-unlock-jewel-icon" />
              </span>
              を使って早期解放できます。
            </span>
            <span className="editor-feature-unlock-message-line">
              Lv.{unlockLevel}になれば、無料解放されます。
            </span>
          </p>
        ) : isEditorFeatureUnlockedAtLevel(feature, userLevel) ? (
          <p className="deck-unlock-message">このツールはすでにレベル解放済みです。</p>
        ) : (
          <p className="deck-unlock-message">このツールはすでに解放済みです。</p>
        )}
        {canPurchase && !canAffordJewels && (
          <p className="deck-unlock-message deck-unlock-insufficient">
            ジュエルが不足しています。
          </p>
        )}
        {error && (
          <p className="deck-unlock-error" role="alert">
            {error}
          </p>
        )}
        {canPurchase && (
          <button
            type="button"
            className="deck-unlock-confirm-btn palette-unlock-confirm-btn"
            disabled={!canAffordJewels}
            onClick={handleUnlock}
          >
            <span>早期解放する</span>
            <JewelAmount
              amount={JEWEL_COST_EDITOR_EARLY_UNLOCK}
              className="palette-unlock-cost editor-feature-unlock-cost"
              iconClassName="palette-unlock-cost-icon editor-feature-unlock-cost-icon"
            />
          </button>
        )}
        <button type="button" className="deck-unlock-close" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>,
    document.body,
  );
}
