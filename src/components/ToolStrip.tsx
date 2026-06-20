import type { ReactNode } from 'react';
import type { BrushSizeId } from '../config/brushSize';
import {
  canPurchaseEditorFeature,
  editorShopIdForTool,
  getEditorToolDisplayLabel,
  isEditorInitialTool,
  isEditorToolAvailable,
  type EditorShopUnlockId,
} from '../config/editorShop';
import {
  getDisplayEditorTools,
  getToolUnlockLevel,
  type EditorToolId,
} from '../config/editorTools';
import { BrushSizeTool } from './BrushSizeTool';
import { ZoomTool } from './ZoomTool';

interface ToolStripProps {
  tool: EditorToolId;
  userLevel?: number;
  editorShopUnlocks?: readonly EditorShopUnlockId[];
  canUndo?: boolean;
  canRedo?: boolean;
  onSelectTool: (tool: EditorToolId) => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  brushSize: BrushSizeId;
  onBrushSizeChange: (size: BrushSizeId) => void;
  onRequestFeatureUnlock: (feature: EditorShopUnlockId) => void;
}

function EditorToolButton({
  toolId,
  userLevel,
  editorShopUnlocks,
  active = false,
  disabled = false,
  baseClassName,
  onClick,
  onRequestUnlock,
  children,
}: {
  toolId: EditorToolId;
  userLevel: number;
  editorShopUnlocks: readonly EditorShopUnlockId[];
  active?: boolean;
  disabled?: boolean;
  baseClassName: string;
  onClick?: () => void;
  onRequestUnlock?: () => void;
  children: ReactNode;
}) {
  const label = getEditorToolDisplayLabel(toolId);
  const unlocked = isEditorToolAvailable(toolId, userLevel, editorShopUnlocks);
  const unlockLevel = getToolUnlockLevel(toolId);
  const shopId = editorShopIdForTool(toolId);
  const canPurchase =
    !unlocked &&
    !isEditorInitialTool(toolId) &&
    shopId != null &&
    canPurchaseEditorFeature(shopId, userLevel, editorShopUnlocks);
  const levelOnlyLocked =
    !unlocked && !canPurchase && !isEditorInitialTool(toolId);

  const title = unlocked
    ? label
    : canPurchase
      ? `${label}（💎で早期解放）`
      : `Lv${unlockLevel}で解放`;

  const handleClick = () => {
    if (unlocked) {
      onClick?.();
      return;
    }
    if (canPurchase) {
      onRequestUnlock?.();
    }
  };

  return (
    <button
      type="button"
      className={[
        baseClassName,
        active && unlocked ? 'active' : '',
        !unlocked ? 'palette-swatch-locked' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={(levelOnlyLocked && !canPurchase) || (unlocked && disabled)}
      title={title}
      onClick={unlocked || canPurchase ? handleClick : undefined}
    >
      {unlocked ? (
        children
      ) : (
        <span className="palette-swatch-lock" aria-hidden>
          🔒
        </span>
      )}
      <span className="sr-only">{title}</span>
    </button>
  );
}

export function ToolStrip({
  tool,
  userLevel = 1,
  editorShopUnlocks = [],
  canUndo = false,
  canRedo = false,
  onSelectTool,
  onClear,
  onUndo,
  onRedo,
  brushSize,
  onBrushSizeChange,
  onRequestFeatureUnlock,
}: ToolStripProps) {
  const displayTools = getDisplayEditorTools();

  const requestUnlockForTool = (toolId: EditorToolId) => {
    const shopId = editorShopIdForTool(toolId);
    if (shopId) onRequestFeatureUnlock(shopId);
  };

  return (
    <div className="editor-tool-strip" role="toolbar" aria-label="描画ツール">
      {displayTools.map((toolId) => {
        const commonProps = {
          toolId,
          userLevel,
          editorShopUnlocks,
          onRequestUnlock: () => requestUnlockForTool(toolId),
        };

        if (toolId === 'undo') {
          return (
            <EditorToolButton
              key={toolId}
              {...commonProps}
              disabled={!canUndo}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-undo"
              onClick={onUndo}
            >
              <span className="palette-undo-icon" aria-hidden>
                ↩
              </span>
            </EditorToolButton>
          );
        }

        if (toolId === 'redo') {
          return (
            <EditorToolButton
              key={toolId}
              {...commonProps}
              disabled={!canRedo}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-redo"
              onClick={onRedo}
            >
              <span className="palette-redo-icon" aria-hidden>
                ↪
              </span>
            </EditorToolButton>
          );
        }

        if (toolId === 'line') {
          return (
            <EditorToolButton
              key={toolId}
              {...commonProps}
              active={tool === 'line'}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-line"
              onClick={() => onSelectTool('line')}
            >
              <span className="palette-line-icon" aria-hidden />
            </EditorToolButton>
          );
        }

        if (toolId === 'rectangle') {
          return (
            <EditorToolButton
              key={toolId}
              {...commonProps}
              active={tool === 'rectangle'}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-rectangle"
              onClick={() => onSelectTool('rectangle')}
            >
              <span className="palette-rectangle-icon" aria-hidden />
            </EditorToolButton>
          );
        }

        if (toolId === 'circle') {
          return (
            <EditorToolButton
              key={toolId}
              {...commonProps}
              active={tool === 'circle'}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-circle"
              onClick={() => onSelectTool('circle')}
            >
              <span className="palette-circle-icon" aria-hidden />
            </EditorToolButton>
          );
        }

        if (toolId === 'selection') {
          return (
            <EditorToolButton
              key={toolId}
              {...commonProps}
              active={tool === 'selection'}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-selection"
              onClick={() => onSelectTool('selection')}
            >
              <span className="palette-selection-icon" aria-hidden />
            </EditorToolButton>
          );
        }

        if (toolId === 'move') {
          return (
            <EditorToolButton
              key={toolId}
              {...commonProps}
              active={tool === 'move'}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-move"
              onClick={() => onSelectTool('move')}
            >
              <span className="palette-move-icon" aria-hidden />
            </EditorToolButton>
          );
        }

        if (toolId === 'pen') {
          return (
            <EditorToolButton
              key={toolId}
              {...commonProps}
              active={tool === 'pen'}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-pen"
              onClick={() => onSelectTool('pen')}
            >
              <span className="palette-emoji-icon" aria-hidden>
                ✏️
              </span>
            </EditorToolButton>
          );
        }

        if (toolId === 'eraser') {
          return (
            <EditorToolButton
              key={toolId}
              {...commonProps}
              active={tool === 'eraser'}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-eraser"
              onClick={() => onSelectTool('eraser')}
            >
              <span className="palette-eraser-icon" aria-hidden>
                <span className="palette-eraser-rubber" />
                <span className="palette-eraser-sleeve" />
              </span>
            </EditorToolButton>
          );
        }

        if (toolId === 'fill') {
          return (
            <EditorToolButton
              key={toolId}
              {...commonProps}
              active={tool === 'fill'}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-fill"
              onClick={() => onSelectTool('fill')}
            >
              <span className="palette-emoji-icon" aria-hidden>
                🪣
              </span>
            </EditorToolButton>
          );
        }

        if (toolId === 'clear') {
          return (
            <EditorToolButton
              key={toolId}
              {...commonProps}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-clear pixel-checkerboard pixel-checkerboard-bg"
              onClick={onClear}
            >
              <span className="palette-clear-label" aria-hidden>
                クリア
              </span>
            </EditorToolButton>
          );
        }

        return null;
      })}
      <BrushSizeTool
        size={brushSize}
        userLevel={userLevel}
        shopUnlocks={editorShopUnlocks}
        onChange={onBrushSizeChange}
        onRequestUnlock={() => onRequestFeatureUnlock('brushSize')}
      />
      <ZoomTool
        userLevel={userLevel}
        shopUnlocks={editorShopUnlocks}
        onRequestUnlock={() => onRequestFeatureUnlock('zoom')}
      />
    </div>
  );
}
