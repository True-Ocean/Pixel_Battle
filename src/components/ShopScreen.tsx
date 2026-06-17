import { PALETTE_16 } from '../config/balance';
import {
  canAffordPaletteShopJewels,
  canAffordPaletteShopPixels,
} from '../config/economy';
import { PALETTE_COLOR_LABELS } from '../config/palette';
import {
  getJewelCostForPaletteIndex,
  getPixelCostForPaletteIndex,
  getShopPaletteIndicesByTier,
  JEWEL_COST_PALETTE_SHOP_TIER2,
  PALETTE_SHOP_MIN_USER_LEVEL,
  PIXEL_COST_PALETTE_SHOP_TIER1,
  PIXEL_COST_PALETTE_SHOP_TIER2,
} from '../config/paletteShop';
import { isPaletteShopUnlocked } from '../config/paletteUnlock';
import { canPurchasePaletteIndex } from '../user/paletteShop';
import { JewelAmount } from './JewelIcon';
import { PixelCoinIcon } from './PixelCoinIcon';

interface ShopScreenProps {
  userLevel: number;
  freePixels: number;
  jewels: number;
  shopUnlocks: readonly number[];
  onUnlockWithPixels: (index: number) => string | null;
  onUnlockWithJewels: (index: number) => string | null;
}

function ShopPaletteItem({
  index,
  userLevel,
  freePixels,
  jewels,
  shopUnlocks,
  onUnlockWithPixels,
  onUnlockWithJewels,
}: {
  index: number;
  userLevel: number;
  freePixels: number;
  jewels: number;
  shopUnlocks: readonly number[];
  onUnlockWithPixels: (index: number) => string | null;
  onUnlockWithJewels: (index: number) => string | null;
}) {
  const color = PALETTE_16[index]!;
  const label = PALETTE_COLOR_LABELS[index] ?? '色';
  const unlocked = isPaletteShopUnlocked(index, shopUnlocks);
  const canPurchase = canPurchasePaletteIndex(index, userLevel, shopUnlocks);
  const pixelCost = getPixelCostForPaletteIndex(index);
  const jewelCost = getJewelCostForPaletteIndex(index);
  const belowLevel = userLevel < PALETTE_SHOP_MIN_USER_LEVEL;
  const canAffordPx =
    pixelCost != null && canAffordPaletteShopPixels({ freePixels }, pixelCost);
  const canAffordJewels =
    jewelCost != null && canAffordPaletteShopJewels({ jewels }, jewelCost);

  return (
    <li className={`shop-palette-item${unlocked ? ' shop-palette-item--owned' : ''}`}>
      <span
        className="shop-palette-swatch"
        style={{ background: color }}
        aria-hidden
      />
      <div className="shop-palette-meta">
        <span className="shop-palette-label">{label}</span>
        {unlocked ? (
          <span className="shop-palette-owned">解放済み</span>
        ) : belowLevel ? (
          <span className="shop-palette-note muted">
            Lv{PALETTE_SHOP_MIN_USER_LEVEL}で購入可能
          </span>
        ) : (
          <div className="shop-palette-actions">
            {pixelCost != null && (
              <button
                type="button"
                className="shop-palette-buy-btn"
                disabled={!canPurchase || !canAffordPx}
                onClick={() => onUnlockWithPixels(index)}
              >
                <PixelCoinIcon className="shop-palette-cost-icon" />
                {pixelCost.toLocaleString()}
              </button>
            )}
            {jewelCost != null && (
              <button
                type="button"
                className="shop-palette-buy-btn"
                disabled={!canPurchase || !canAffordJewels}
                onClick={() => onUnlockWithJewels(index)}
              >
                <JewelAmount
                  amount={jewelCost}
                  className="shop-palette-jewel-cost"
                  iconClassName="shop-palette-cost-icon"
                />
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export function ShopScreen({
  userLevel,
  freePixels,
  jewels,
  shopUnlocks,
  onUnlockWithPixels,
  onUnlockWithJewels,
}: ShopScreenProps) {
  const tier1Indices = getShopPaletteIndicesByTier('tier1');
  const tier2Indices = getShopPaletteIndicesByTier('tier2');

  return (
    <section className="screen shop-screen">
      <header className="shop-header">
        <h1>ショップ</h1>
        <p className="shop-subtitle muted">
          レベル解放の上に、追加色を永久解放できます（Lv
          {PALETTE_SHOP_MIN_USER_LEVEL}以降）。
        </p>
      </header>

      <div className="shop-section">
        <h2 className="shop-section-title">追加色（基本4色）</h2>
        <p className="shop-section-note muted">
          各 {PIXEL_COST_PALETTE_SHOP_TIER1.toLocaleString()} px
        </p>
        <ul className="shop-palette-list">
          {tier1Indices.map((index) => (
            <ShopPaletteItem
              key={index}
              index={index}
              userLevel={userLevel}
              freePixels={freePixels}
              jewels={jewels}
              shopUnlocks={shopUnlocks}
              onUnlockWithPixels={onUnlockWithPixels}
              onUnlockWithJewels={onUnlockWithJewels}
            />
          ))}
        </ul>
      </div>

      <div className="shop-section">
        <h2 className="shop-section-title">追加色（薄色系8色）</h2>
        <p className="shop-section-note muted">
          各 💎{JEWEL_COST_PALETTE_SHOP_TIER2} または{' '}
          {PIXEL_COST_PALETTE_SHOP_TIER2.toLocaleString()} px
        </p>
        <ul className="shop-palette-list">
          {tier2Indices.map((index) => (
            <ShopPaletteItem
              key={index}
              index={index}
              userLevel={userLevel}
              freePixels={freePixels}
              jewels={jewels}
              shopUnlocks={shopUnlocks}
              onUnlockWithPixels={onUnlockWithPixels}
              onUnlockWithJewels={onUnlockWithJewels}
            />
          ))}
        </ul>
      </div>
    </section>
  );
}
