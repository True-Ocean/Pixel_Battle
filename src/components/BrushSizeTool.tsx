import { useEffect, useRef, useState } from 'react';
import {
  BRUSH_SIZE_IDS,
  BRUSH_SIZE_LABELS,
  type BrushSizeId,
} from '../config/brushSize';

interface BrushSizeToolProps {
  size: BrushSizeId;
  onChange: (size: BrushSizeId) => void;
}

export function BrushSizeTool({ size, onChange }: BrushSizeToolProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (anchorRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div ref={anchorRef} className="editor-brush-size-anchor">
      <button
        type="button"
        className={`palette-swatch palette-swatch-tool brush-size-tool-btn${
          open ? ' brush-size-tool-btn--open' : ''
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
        title={`太さ: ${BRUSH_SIZE_LABELS[size]}`}
        onClick={() => setOpen((current) => !current)}
      >
        <span
          className={`brush-size-tool-dot brush-size-tool-dot--${size}`}
          aria-hidden
        />
        <span className="sr-only">太さ {BRUSH_SIZE_LABELS[size]}</span>
      </button>
      {open && (
        <div className="brush-size-menu" role="menu" aria-label="太さ">
          {BRUSH_SIZE_IDS.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={size === option}
              title={`太さ: ${BRUSH_SIZE_LABELS[option]}`}
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
              <span className="sr-only">{BRUSH_SIZE_LABELS[option]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
