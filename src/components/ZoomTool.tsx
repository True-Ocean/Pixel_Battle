import {
  canPurchaseEditorFeature,
  EDITOR_FEATURE_LABELS,
  EDITOR_FEATURE_UNLOCK_LEVEL,
  isEditorFeatureUnlocked,
  type EditorShopUnlockId,
} from '../config/editorShop';

interface ZoomToolProps {
  userLevel: number;
  shopUnlocks: readonly EditorShopUnlockId[];
  onRequestUnlock: () => void;
}

export function ZoomTool({
  userLevel,
  shopUnlocks,
  onRequestUnlock,
}: ZoomToolProps) {
  const unlocked = isEditorFeatureUnlocked('zoom', userLevel, shopUnlocks);
  const unlockLevel = EDITOR_FEATURE_UNLOCK_LEVEL.zoom;
  const canPurchase = canPurchaseEditorFeature('zoom', userLevel, shopUnlocks);

  return (
    <button
      type="button"
      className={`palette-swatch palette-swatch-tool brush-size-tool-btn${
        unlocked ? ' editor-zoom-tool--unlocked' : ' palette-swatch-locked'
      }`}
      disabled={!unlocked && !canPurchase}
      title={
        unlocked
          ? 'ズーム（2本指で拡大・縮小・移動）'
          : canPurchase
            ? `${EDITOR_FEATURE_LABELS.zoom}（💎で早期解放）`
            : `Lv${unlockLevel}で解放`
      }
      onClick={() => {
        if (!unlocked && canPurchase) onRequestUnlock();
      }}
    >
      {unlocked ? (
        <span className="palette-zoom-icon" aria-hidden>
          ⌕
        </span>
      ) : (
        <span className="palette-swatch-lock" aria-hidden>
          🔒
        </span>
      )}
      <span className="sr-only">{EDITOR_FEATURE_LABELS.zoom}</span>
    </button>
  );
}
