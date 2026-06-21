import type { EditorShopUnlockId } from '../config/editorShop';
import type { EditorToolId } from '../config/editorTools';

interface EditorToolIconProps {
  toolId: EditorToolId;
  className?: string;
}

export function EditorToolIcon({ toolId, className }: EditorToolIconProps) {
  const rootClass = ['editor-tool-icon', className].filter(Boolean).join(' ');

  if (toolId === 'undo') {
    return (
      <span className={rootClass} aria-hidden>
        <span className="palette-undo-icon">↩</span>
      </span>
    );
  }

  if (toolId === 'redo') {
    return (
      <span className={rootClass} aria-hidden>
        <span className="palette-redo-icon">↪</span>
      </span>
    );
  }

  if (toolId === 'line') {
    return (
      <span className={rootClass} aria-hidden>
        <span className="palette-line-icon" />
      </span>
    );
  }

  if (toolId === 'rectangle') {
    return (
      <span className={rootClass} aria-hidden>
        <span className="palette-rectangle-icon" />
      </span>
    );
  }

  if (toolId === 'circle') {
    return (
      <span className={rootClass} aria-hidden>
        <span className="palette-circle-icon" />
      </span>
    );
  }

  if (toolId === 'selection') {
    return (
      <span className={rootClass} aria-hidden>
        <span className="palette-selection-icon" />
      </span>
    );
  }

  if (toolId === 'move') {
    return (
      <span className={rootClass} aria-hidden>
        <span className="palette-move-icon" />
      </span>
    );
  }

  if (toolId === 'pen') {
    return (
      <span className={rootClass} aria-hidden>
        <span className="palette-emoji-icon">✏️</span>
      </span>
    );
  }

  if (toolId === 'eraser') {
    return (
      <span className={rootClass} aria-hidden>
        <span className="palette-eraser-icon">
          <span className="palette-eraser-rubber" />
          <span className="palette-eraser-sleeve" />
        </span>
      </span>
    );
  }

  if (toolId === 'fill') {
    return (
      <span className={rootClass} aria-hidden>
        <span className="palette-emoji-icon">🪣</span>
      </span>
    );
  }

  if (toolId === 'clear') {
    return (
      <span className={rootClass} aria-hidden>
        <span className="palette-clear-label">クリア</span>
      </span>
    );
  }

  return null;
}

export function editorToolIdForShopFeature(
  feature: EditorShopUnlockId,
): EditorToolId | 'brushSize' | 'zoom' {
  switch (feature) {
    case 'undo':
      return 'undo';
    case 'redo':
      return 'redo';
    case 'line':
      return 'line';
    case 'rectangle':
      return 'rectangle';
    case 'circle':
      return 'circle';
    case 'move':
      return 'move';
    case 'copy':
      return 'selection';
    case 'brushSize':
      return 'brushSize';
    case 'zoom':
      return 'zoom';
    default:
      return 'pen';
  }
}

interface EditorShopFeatureIconProps {
  feature: EditorShopUnlockId;
  className?: string;
}

export function EditorShopFeatureIcon({
  feature,
  className,
}: EditorShopFeatureIconProps) {
  const mapped = editorToolIdForShopFeature(feature);

  if (mapped === 'brushSize') {
    return (
      <span className={['editor-tool-icon', className].filter(Boolean).join(' ')} aria-hidden>
        <span className="brush-size-tool-dot brush-size-tool-dot--medium" />
      </span>
    );
  }

  if (mapped === 'zoom') {
    return (
      <span className={['editor-tool-icon', className].filter(Boolean).join(' ')} aria-hidden>
        <span className="palette-zoom-icon">⌕</span>
      </span>
    );
  }

  return <EditorToolIcon toolId={mapped} className={className} />;
}
