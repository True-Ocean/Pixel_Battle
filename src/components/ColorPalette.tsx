import { PALETTE_16 } from '../config/balance';
import {
  PALETTE_COLOR_LABELS,
  PALETTE_EDITOR_COLOR_COUNT,
} from '../config/palette';
import {
  canOfferPaletteJewelPurchase,
  isBottomRowJewelPaletteIndex,
  isJewelPaletteIndex,
  isRightColumnJewelPaletteIndex,
  PALETTE_RIGHT_COLUMN_MIN_USER_LEVEL,
} from '../config/paletteShop';
import {
  isPaletteUnlocked,
  isPaletteUnlockedAtLevel,
  PALETTE_UNLOCK_LEVELS,
} from '../config/paletteUnlock';

function paletteUnlockLevelForIndex(index: number): number | null {
  if (index < 3) return 1;
  const extraIndex = index - 3;
  return PALETTE_UNLOCK_LEVELS[extraIndex] ?? null;
}

const LIGHT_SWATCH_COLORS = new Set([
  '#ffffff',
  '#ffdd00',
  '#ffffcc',
  '#ccffcc',
  '#ffddaa',
  '#ffccff',
  '#ddccff',
  '#ffaaaa',
  '#aaccff',
]);

interface ColorPaletteProps {
  brushColor: string;
  userLevel?: number;
  shopUnlocks?: readonly number[];
  onSelectColor: (color: string) => void;
  onRequestShopUnlock?: (index: number) => void;
}

export function ColorPalette({
  brushColor,
  userLevel = 1,
  shopUnlocks = [],
  onSelectColor,
  onRequestShopUnlock,
}: ColorPaletteProps) {
  return (
    <div
      className="editor-color-palette"
      role="toolbar"
      aria-label="カラーパレット"
    >
      {Array.from({ length: PALETTE_EDITOR_COLOR_COUNT }, (_, index) => {
        const color = PALETTE_16[index]!;
        const unlocked = isPaletteUnlocked(index, userLevel, shopUnlocks);
        const isJewelColor = isJewelPaletteIndex(index);
        const unlockLevel = !isJewelColor
          ? paletteUnlockLevelForIndex(index)
          : null;
        const label = PALETTE_COLOR_LABELS[index];
        const active = brushColor === color;
        const isLight = LIGHT_SWATCH_COLORS.has(color.toLowerCase());
        const canPurchaseJewel =
          isJewelColor &&
          canOfferPaletteJewelPurchase(index, userLevel) &&
          !unlocked;

        let title = label;
        if (!unlocked) {
          if (isBottomRowJewelPaletteIndex(index)) {
            const topIndex = index - 10;
            if (!isPaletteUnlockedAtLevel(topIndex, userLevel)) {
              const topLevel = paletteUnlockLevelForIndex(topIndex);
              title =
                topLevel != null
                  ? `上の色（Lv${topLevel}）解放後に💎購入可能`
                  : label;
            } else {
              title = `${label}（💎で解放）`;
            }
          } else if (isRightColumnJewelPaletteIndex(index)) {
            title =
              userLevel >= PALETTE_RIGHT_COLUMN_MIN_USER_LEVEL
                ? `${label}（💎で解放）`
                : `Lv${PALETTE_RIGHT_COLUMN_MIN_USER_LEVEL}で${label}を購入可能`;
          } else if (unlockLevel != null) {
            title = `Lv${unlockLevel}で解放`;
          }
        }

        return (
          <button
            key={index}
            type="button"
            className={[
              'palette-swatch',
              isLight ? 'palette-swatch-light' : '',
              active ? 'active' : '',
              !unlocked ? 'palette-swatch-locked' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ background: color }}
            disabled={!unlocked && !canPurchaseJewel}
            title={title}
            onClick={() => {
              if (unlocked) {
                onSelectColor(color);
                return;
              }
              if (canPurchaseJewel) onRequestShopUnlock?.(index);
            }}
          >
            {!unlocked && (
              <span className="palette-swatch-lock" aria-hidden>
                🔒
              </span>
            )}
            <span className="sr-only">{title}</span>
          </button>
        );
      })}
    </div>
  );
}
