import {
  getVisibleEditorTools,
  type EditorToolId,
} from '../config/editorTools';

interface ToolStripProps {
  tool: EditorToolId;
  userLevel?: number;
  canUndo?: boolean;
  canRedo?: boolean;
  onSelectTool: (tool: EditorToolId) => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
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

        if (toolId === 'redo') {
          return (
            <button
              key={toolId}
              type="button"
              className="palette-swatch palette-swatch-tool palette-swatch-redo"
              disabled={!canRedo}
              title="やり直す"
              onClick={onRedo}
            >
              <span className="palette-redo-icon" aria-hidden>
                ↪
              </span>
              <span className="sr-only">やり直す</span>
            </button>
          );
        }

        if (toolId === 'eyedropper') {
          return (
            <button
              key={toolId}
              type="button"
              className={
                tool === 'eyedropper'
                  ? 'palette-swatch palette-swatch-tool palette-swatch-eyedropper active'
                  : 'palette-swatch palette-swatch-tool palette-swatch-eyedropper'
              }
              title="スポイト"
              onClick={() => onSelectTool('eyedropper')}
            >
              <span className="palette-eyedropper-icon" aria-hidden />
              <span className="sr-only">スポイト</span>
            </button>
          );
        }

        if (toolId === 'line') {
          return (
            <button
              key={toolId}
              type="button"
              className={
                tool === 'line'
                  ? 'palette-swatch palette-swatch-tool palette-swatch-line active'
                  : 'palette-swatch palette-swatch-tool palette-swatch-line'
              }
              title="直線"
              onClick={() => onSelectTool('line')}
            >
              <span className="palette-line-icon" aria-hidden />
              <span className="sr-only">直線</span>
            </button>
          );
        }

        if (toolId === 'rectangle') {
          return (
            <button
              key={toolId}
              type="button"
              className={
                tool === 'rectangle'
                  ? 'palette-swatch palette-swatch-tool palette-swatch-rectangle active'
                  : 'palette-swatch palette-swatch-tool palette-swatch-rectangle'
              }
              title="矩形"
              onClick={() => onSelectTool('rectangle')}
            >
              <span className="palette-rectangle-icon" aria-hidden />
              <span className="sr-only">矩形</span>
            </button>
          );
        }

        if (toolId === 'circle') {
          return (
            <button
              key={toolId}
              type="button"
              className={
                tool === 'circle'
                  ? 'palette-swatch palette-swatch-tool palette-swatch-circle active'
                  : 'palette-swatch palette-swatch-tool palette-swatch-circle'
              }
              title="円"
              onClick={() => onSelectTool('circle')}
            >
              <span className="palette-circle-icon" aria-hidden />
              <span className="sr-only">円</span>
            </button>
          );
        }

        if (toolId === 'selection') {
          return (
            <button
              key={toolId}
              type="button"
              className={
                tool === 'selection'
                  ? 'palette-swatch palette-swatch-tool palette-swatch-selection active'
                  : 'palette-swatch palette-swatch-tool palette-swatch-selection'
              }
              title="選択"
              onClick={() => onSelectTool('selection')}
            >
              <span className="palette-selection-icon" aria-hidden />
              <span className="sr-only">選択</span>
            </button>
          );
        }

        if (toolId === 'pen') {
          return (
            <button
              key={toolId}
              type="button"
              className={
                tool === 'pen'
                  ? 'palette-swatch palette-swatch-tool palette-swatch-pen active'
                  : 'palette-swatch palette-swatch-tool palette-swatch-pen'
              }
              title="ペン"
              onClick={() => onSelectTool('pen')}
            >
              <span className="palette-pen-icon" aria-hidden />
              <span className="sr-only">ペン</span>
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
