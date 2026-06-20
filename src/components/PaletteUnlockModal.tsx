import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PALETTE_16 } from '../config/balance';
import { PALETTE_COLOR_LABELS } from '../config/palette';
import { canAffordPaletteShopJewels } from '../config/economy';
import { getJewelCostForPaletteIndex } from '../config/paletteShop';
import { canPurchasePaletteIndex } from '../user/paletteShop';
import { JewelAmount } from './JewelIcon';

interface PaletteUnlockModalProps {
  paletteIndex: number;
  userLevel: number;
  jewels: number;
  shopUnlocks: readonly number[];
  onClose: () => void;
  onUnlockWithJewels?: (index: number) => string | null;
}

export function PaletteUnlockModal({
  paletteIndex,
  userLevel,
  jewels,
  shopUnlocks,
  onClose,
  onUnlockWithJewels,
}: PaletteUnlockModalProps) {
  const [error, setError] = useState<string | null>(null);
  const color = PALETTE_16[paletteIndex]!;
  const colorLabel = PALETTE_COLOR_LABELS[paletteIndex] ?? '色';
  const jewelCost = getJewelCostForPaletteIndex(paletteIndex);
  const canPurchase = canPurchasePaletteIndex(
    paletteIndex,
    userLevel,
    shopUnlocks,
  );
  const canAffordJewels =
    jewelCost != null && canAffordPaletteShopJewels({ jewels }, jewelCost);
  const showJewelButton =
    canPurchase && jewelCost != null && onUnlockWithJewels != null;

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

  const handleUnlockWithJewels = () => {
    if (!showJewelButton || !canAffordJewels) return;
    const message = onUnlockWithJewels(paletteIndex);
    if (message) setError(message);
    else onClose();
  };

  return createPortal(
    <div className="deck-unlock-backdrop" onClick={onClose}>
      <div
        className={`deck-unlock-panel palette-unlock-panel palette-unlock-panel--compact${canPurchase ? ' deck-unlock-panel--ready' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="palette-unlock-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="palette-unlock-title" className="deck-unlock-title">
          色の解放
        </h2>
        <div className="palette-unlock-preview">
          <span
            className="palette-unlock-swatch"
            style={{ background: color }}
            role="img"
            aria-label={colorLabel}
          />
        </div>
        {showJewelButton && !canAffordJewels && (
          <p className="deck-unlock-message deck-unlock-insufficient palette-unlock-insufficient">
            ジュエルが不足しています。
          </p>
        )}
        {error && (
          <p className="deck-unlock-error" role="alert">
            {error}
          </p>
        )}
        {showJewelButton && (
          <button
            type="button"
            className="deck-unlock-confirm-btn palette-unlock-confirm-btn"
            disabled={!canAffordJewels}
            onClick={handleUnlockWithJewels}
          >
            <span>解放する</span>
            <JewelAmount
              amount={jewelCost}
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
