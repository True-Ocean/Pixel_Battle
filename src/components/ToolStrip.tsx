import { getVisibleEditorTools } from '../config/editorTools';
import type { EditorTool } from './PixelCanvas';

interface ToolStripProps {
  tool: EditorTool;
  userLevel?: number;
  canUndo?: boolean;
  onSelectTool: (tool: 'eraser' | 'fill') => void;
  onClear: () => void;
  onUndo: () => void;
}

export function ToolStrip({
  tool,
  userLevel = 1,
  canUndo = false,
  onSelectTool,
  onClear,
  onUndo,
}: ToolStripProps) {
  const visibleTools = getVisibleEditorTools(userLevel);

  return (
    <div className="editor-tool-strip" role="toolbar" aria-label="描画ツール">
      {visibleTools.map((toolId) => {
        if (toolId === 'undo') {
          return (
            <button
              key={toolId}
              type="button"
              className="palette-swatch palette-swatch-tool palette-swatch-undo"
              disabled={!canUndo}
              title="元に戻す"
              onClick={onUndo}
            >
              <span className="palette-undo-icon" aria-hidden>
                ↩
              </span>
              <span className="sr-only">元に戻す</span>
            </button>
          );
        }

        if (toolId === 'eraser') {
          return (
            <button
              key={toolId}
              type="button"
              className={
                tool === 'eraser'
                  ? 'palette-swatch palette-swatch-tool palette-swatch-eraser active'
                  : 'palette-swatch palette-swatch-tool palette-swatch-eraser'
              }
              title="消しゴム"
              onClick={() => onSelectTool('eraser')}
            >
              <span className="palette-eraser-icon" aria-hidden>
                <span className="palette-eraser-rubber" />
                <span className="palette-eraser-sleeve" />
              </span>
              <span className="sr-only">消しゴム</span>
            </button>
          );
        }

        if (toolId === 'fill') {
          return (
            <button
              key={toolId}
              type="button"
              className={
                tool === 'fill'
                  ? 'palette-swatch palette-swatch-tool palette-swatch-fill active'
                  : 'palette-swatch palette-swatch-tool palette-swatch-fill'
              }
              title="塗りつぶし"
              onClick={() => onSelectTool('fill')}
            >
              <span className="palette-fill-icon" aria-hidden />
              <span className="sr-only">塗りつぶし</span>
            </button>
          );
        }

        if (toolId === 'clear') {
          return (
            <button
              key={toolId}
              type="button"
              className="palette-swatch palette-swatch-tool palette-swatch-clear pixel-checkerboard pixel-checkerboard-bg"
              title="クリア"
              onClick={onClear}
            >
              <span className="palette-clear-label" aria-hidden>
                クリア
              </span>
              <span className="sr-only">クリア</span>
            </button>
          );
        }

        return null;
      })}
    </div>
  );
}
