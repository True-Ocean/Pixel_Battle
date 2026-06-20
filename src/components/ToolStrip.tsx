import type { ReactNode } from 'react';
import type { BrushSizeId } from '../config/brushSize';
import {
  getDisplayEditorTools,
  getToolUnlockLevel,
  isEditorToolUnlocked,
  type EditorToolId,
} from '../config/editorTools';
import { BrushSizeTool } from './BrushSizeTool';

interface ToolStripProps {
  tool: EditorToolId;
  userLevel?: number;
  canUndo?: boolean;
  canRedo?: boolean;
  onSelectTool: (tool: EditorToolId) => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  brushSize: BrushSizeId;
  onBrushSizeChange: (size: BrushSizeId) => void;
}

function EditorToolButton({
  toolId,
  userLevel,
  active = false,
  disabled = false,
  baseClassName,
  label,
  onClick,
  children,
}: {
  toolId: EditorToolId;
  userLevel: number;
  active?: boolean;
  disabled?: boolean;
  baseClassName: string;
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const unlocked = isEditorToolUnlocked(toolId, userLevel);
  const unlockLevel = getToolUnlockLevel(toolId);

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
      disabled={!unlocked || disabled}
      title={unlocked ? label : `Lv${unlockLevel}で解放`}
      onClick={unlocked ? onClick : undefined}
    >
      {unlocked ? (
        children
      ) : (
        <span className="palette-swatch-lock" aria-hidden>
          🔒
        </span>
      )}
      <span className="sr-only">
        {unlocked ? label : `Lv${unlockLevel}で解放`}
      </span>
    </button>
  );
}

export function ToolStrip({
  tool,
  userLevel = 1,
  canUndo = false,
  canRedo = false,
  onSelectTool,
  onClear,
  onUndo,
  onRedo,
  brushSize,
  onBrushSizeChange,
}: ToolStripProps) {
  const displayTools = getDisplayEditorTools();

  return (
    <div className="editor-tool-strip" role="toolbar" aria-label="描画ツール">
      {displayTools.map((toolId) => {
        if (toolId === 'undo') {
          return (
            <EditorToolButton
              key={toolId}
              toolId={toolId}
              userLevel={userLevel}
              disabled={!canUndo}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-undo"
              label="元に戻す"
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
              toolId={toolId}
              userLevel={userLevel}
              disabled={!canRedo}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-redo"
              label="やり直す"
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
              toolId={toolId}
              userLevel={userLevel}
              active={tool === 'line'}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-line"
              label="直線"
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
              toolId={toolId}
              userLevel={userLevel}
              active={tool === 'rectangle'}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-rectangle"
              label="矩形"
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
              toolId={toolId}
              userLevel={userLevel}
              active={tool === 'circle'}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-circle"
              label="円"
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
              toolId={toolId}
              userLevel={userLevel}
              active={tool === 'selection'}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-selection"
              label="選択"
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
              toolId={toolId}
              userLevel={userLevel}
              active={tool === 'move'}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-move"
              label="移動"
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
              toolId={toolId}
              userLevel={userLevel}
              active={tool === 'pen'}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-pen"
              label="ペン"
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
              toolId={toolId}
              userLevel={userLevel}
              active={tool === 'eraser'}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-eraser"
              label="消しゴム"
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
              toolId={toolId}
              userLevel={userLevel}
              active={tool === 'fill'}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-fill"
              label="塗りつぶし"
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
              toolId={toolId}
              userLevel={userLevel}
              baseClassName="palette-swatch palette-swatch-tool palette-swatch-clear pixel-checkerboard pixel-checkerboard-bg"
              label="クリア"
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
      <BrushSizeTool size={brushSize} onChange={onBrushSizeChange} />
    </div>
  );
}
