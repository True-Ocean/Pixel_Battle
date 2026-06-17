import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PALETTE_16 } from '../config/balance';
import { PALETTE_COLOR_LABELS } from '../config/palette';
import {
  canAffordPaletteShopJewels,
  canAffordPaletteShopPixels,
} from '../config/economy';
import {
  getJewelCostForPaletteIndex,
  getPaletteShopTier,
  getPixelCostForPaletteIndex,
  PALETTE_SHOP_MIN_USER_LEVEL,
} from '../config/paletteShop';
import { canPurchasePaletteIndex } from '../user/paletteShop';
import { JewelAmount } from './JewelIcon';
import { PixelCoinIcon } from './PixelCoinIcon';

interface PaletteUnlockModalProps {
  paletteIndex: number;
  userLevel: number;
  freePixels: number;
  jewels: number;
  shopUnlocks: readonly number[];
  onClose: () => void;
  onUnlockWithPixels?: (index: number) => string | null;
  onUnlockWithJewels?: (index: number) => string | null;
}

export function PaletteUnlockModal({
  paletteIndex,
  userLevel,
  freePixels,
  jewels,
  shopUnlocks,
  onClose,
  onUnlockWithPixels,
  onUnlockWithJewels,
}: PaletteUnlockModalProps) {
  const [error, setError] = useState<string | null>(null);
  const color = PALETTE_16[paletteIndex]!;
  const label = PALETTE_COLOR_LABELS[paletteIndex] ?? '色';
  const tier = getPaletteShopTier(paletteIndex);
  const pixelCost = getPixelCostForPaletteIndex(paletteIndex);
  const jewelCost = getJewelCostForPaletteIndex(paletteIndex);
  const canPurchase = canPurchasePaletteIndex(
    paletteIndex,
    userLevel,
    shopUnlocks,
  );
  const belowLevel = userLevel < PALETTE_SHOP_MIN_USER_LEVEL;
  const canAffordPx =
    pixelCost != null && canAffordPaletteShopPixels({ freePixels }, pixelCost);
  const canAffordJewels =
    jewelCost != null && canAffordPaletteShopJewels({ jewels }, jewelCost);
  const showPixelButton =
    canPurchase && pixelCost != null && onUnlockWithPixels != null;
  const showJewelButton =
    tier === 'tier2' &&
    canPurchase &&
    jewelCost != null &&
    onUnlockWithJewels != null;

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

  const handleUnlockWithPixels = () => {
    if (!showPixelButton || !canAffordPx) return;
    const message = onUnlockWithPixels(paletteIndex);
    if (message) setError(message);
  };

  const handleUnlockWithJewels = () => {
    if (!showJewelButton || !canAffordJewels) return;
    const message = onUnlockWithJewels(paletteIndex);
    if (message) setError(message);
  };

  return createPortal(
    <div className="deck-unlock-backdrop" onClick={onClose}>
      <div
        className={`deck-unlock-panel palette-unlock-panel${canPurchase ? ' deck-unlock-panel--ready' : ''}`}
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
            aria-hidden
          />
          <p className="palette-unlock-label">{label}</p>
        </div>
        {belowLevel ? (
          <p className="deck-unlock-message">
            ユーザーレベル{PALETTE_SHOP_MIN_USER_LEVEL}到達後、ショップで購入できます。
          </p>
        ) : canPurchase ? (
          <p className="deck-unlock-message">
            永久解放です。購入後はお絵描きで使えるようになります。
          </p>
        ) : (
          <p className="deck-unlock-message">この色はすでに解放済みです。</p>
        )}
        {!belowLevel && canPurchase && pixelCost != null && !canAffordPx && (
          <p className="deck-unlock-message deck-unlock-insufficient">
            解放に必要な
            <PixelCoinIcon className="deck-unlock-insufficient-jewel-icon" />
            が不足しています。
          </p>
        )}
        {error && (
          <p className="deck-unlock-error" role="alert">
            {error}
          </p>
        )}
        {showPixelButton && (
          <button
            type="button"
            className="deck-unlock-confirm-btn palette-unlock-confirm-btn"
            disabled={!canAffordPx}
            onClick={handleUnlockWithPixels}
          >
            <span>pxで解放する</span>
            <span className="palette-unlock-cost">
              <PixelCoinIcon className="palette-unlock-cost-icon" />
              {pixelCost.toLocaleString()}
            </span>
          </button>
        )}
        {showJewelButton && (
          <button
            type="button"
            className="deck-unlock-confirm-btn palette-unlock-confirm-btn"
            disabled={!canAffordJewels}
            onClick={handleUnlockWithJewels}
          >
            <span>ジュエルで解放する</span>
            <JewelAmount
              amount={jewelCost}
              className="palette-unlock-cost"
              iconClassName="palette-unlock-cost-icon"
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
