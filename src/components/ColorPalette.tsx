import { PALETTE_16 } from '../config/balance';
import {
  PALETTE_COLOR_LABELS,
  PALETTE_EDITOR_COLOR_COUNT,
} from '../config/palette';
import {
  PALETTE_UNLOCK_LEVELS,
  isPaletteUnlockedAtLevel,
} from '../config/paletteUnlock';
function paletteUnlockLevelForIndex(index: number): number | null {
  if (index < 3) return 1;
  const extraIndex = index - 3;
  return PALETTE_UNLOCK_LEVELS[extraIndex] ?? null;
}

interface ColorPaletteProps {
  brushColor: string;
  userLevel?: number;
  onSelectColor: (color: string) => void;
}

export function ColorPalette({
  brushColor,
  userLevel = 1,
  onSelectColor,
}: ColorPaletteProps) {
  return (
    <div
      className="editor-color-palette"
      role="toolbar"
      aria-label="カラーパレット"
    >
      {Array.from({ length: PALETTE_EDITOR_COLOR_COUNT }, (_, index) => {
        const color = PALETTE_16[index]!;
        const unlocked = isPaletteUnlockedAtLevel(index, userLevel);
        const unlockLevel = paletteUnlockLevelForIndex(index);
        const label = PALETTE_COLOR_LABELS[index];
        const active = brushColor === color;
        const isLight = color === '#ffffff';

        return (
          <button
            key={color}
            type="button"
            className={[
              'palette-swatch',
              isLight ? 'palette-swatch-light' : '',
              active ? 'active' : '',
              !unlocked ? 'palette-swatch-locked' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{ background: unlocked ? color : undefined }}
            disabled={!unlocked}
            title={
              unlocked
                ? label
                : unlockLevel != null
                  ? `Lv${unlockLevel}で解放`
                  : label
            }
            onClick={() => onSelectColor(color)}
          >
            {!unlocked && (
              <span className="palette-swatch-lock" aria-hidden>
                🔒
              </span>
            )}
            <span className="sr-only">
              {label}
              {!unlocked && unlockLevel != null ? `（Lv${unlockLevel}で解放）` : ''}
            </span>
          </button>
        );
      })}
    </div>
  );
}
