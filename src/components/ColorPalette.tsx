import { PALETTE_16 } from '../config/balance';
import {
  PALETTE_COLOR_LABELS,
  PALETTE_EDITOR_COLOR_COUNT,
} from '../config/palette';
import {
  canOfferPaletteShopPurchase,
  isShopPaletteIndex,
} from '../config/paletteShop';
import {
  PALETTE_UNLOCK_LEVELS,
  isPaletteUnlocked,
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
        const isShopColor = isShopPaletteIndex(index);
        const unlockLevel = !isShopColor
          ? paletteUnlockLevelForIndex(index)
          : null;
        const label = PALETTE_COLOR_LABELS[index];
        const active = brushColor === color;
        const isLight = LIGHT_SWATCH_COLORS.has(color.toLowerCase());
        const canOpenShop =
          isShopColor &&
          canOfferPaletteShopPurchase(index, userLevel) &&
          !unlocked;

        const title = unlocked
          ? label
          : isShopColor
            ? userLevel >= 50
              ? `${label}（ショップで解放）`
              : `Lv50で${label}を購入可能`
            : unlockLevel != null
              ? `Lv${unlockLevel}で解放`
              : label;

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
            disabled={!unlocked && !canOpenShop}
            title={title}
            onClick={() => {
              if (unlocked) {
                onSelectColor(color);
                return;
              }
              if (canOpenShop) onRequestShopUnlock?.(index);
            }}
          >
            {!unlocked && (
              <span className="palette-swatch-lock" aria-hidden>
                🔒
              </span>
            )}
            <span className="sr-only">
              {label}
              {!unlocked && unlockLevel != null
                ? `（Lv${unlockLevel}で解放）`
                : ''}
              {!unlocked && isShopColor ? '（ショップで解放）' : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}
