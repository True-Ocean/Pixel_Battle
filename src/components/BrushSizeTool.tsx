import { useEffect, useRef, useState } from 'react';
import {
  BRUSH_SIZE_IDS,
  type BrushSizeId,
} from '../config/brushSize';
import {
  canPurchaseEditorFeature,
  EDITOR_FEATURE_LABELS,
  EDITOR_FEATURE_UNLOCK_LEVEL,
  isEditorFeatureUnlocked,
  type EditorShopUnlockId,
} from '../config/editorShop';

interface BrushSizeToolProps {
  size: BrushSizeId;
  userLevel: number;
  shopUnlocks: readonly EditorShopUnlockId[];
  onChange: (size: BrushSizeId) => void;
  onRequestUnlock: () => void;
}

export function BrushSizeTool({
  size,
  userLevel,
  shopUnlocks,
  onChange,
  onRequestUnlock,
}: BrushSizeToolProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const unlocked = isEditorFeatureUnlocked('brushSize', userLevel, shopUnlocks);
  const canPurchase = canPurchaseEditorFeature('brushSize', userLevel, shopUnlocks);
  const unlockLevel = EDITOR_FEATURE_UNLOCK_LEVEL.brushSize;

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (anchorRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const handleMainClick = () => {
    if (!unlocked) {
      if (canPurchase) onRequestUnlock();
      return;
    }
    setOpen((current) => !current);
  };

  return (
    <div ref={anchorRef} className="editor-brush-size-anchor">
      <button
        type="button"
        className={`palette-swatch palette-swatch-tool brush-size-tool-btn${
          open && unlocked ? ' brush-size-tool-btn--open' : ''
        }${!unlocked ? ' palette-swatch-locked' : ''}`}
        aria-expanded={unlocked ? open : false}
        aria-haspopup={unlocked ? 'menu' : undefined}
        title={
          unlocked
            ? `太さ`
            : canPurchase
              ? `${EDITOR_FEATURE_LABELS.brushSize}（💎で早期解放）`
              : `Lv${unlockLevel}で解放`
        }
        onClick={handleMainClick}
      >
        {unlocked ? (
          <>
            <span
              className={`brush-size-tool-dot brush-size-tool-dot--${size}`}
              aria-hidden
            />
            <span className="sr-only">太さ</span>
          </>
        ) : (
          <span className="palette-swatch-lock" aria-hidden>
            🔒
          </span>
        )}
      </button>
      {unlocked && open && (
        <div className="brush-size-menu" role="menu" aria-label="太さ">
          {BRUSH_SIZE_IDS.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={size === option}
              className={`brush-size-menu-item${
                size === option ? ' brush-size-menu-item--active' : ''
              }`}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              <span
                className={`brush-size-tool-dot brush-size-tool-dot--${option}`}
                aria-hidden
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
