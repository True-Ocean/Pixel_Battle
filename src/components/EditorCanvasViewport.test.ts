import { describe, expect, it } from 'vitest';
import { applyPinchStep } from './EditorCanvasViewport';

const content = { width: 300, height: 300 };

describe('applyPinchStep', () => {
  it('指を広げると拡大する', () => {
    const last = {
      distance: 100,
      center: { x: 150, y: 150 },
      zoom: 1,
      pan: { x: 0, y: 0 },
    };
    const next = applyPinchStep(last, 200, { x: 150, y: 150 }, content);
    expect(next.zoom).toBeGreaterThan(1);
  });

  it('指を狭めると縮小する', () => {
    const last = {
      distance: 200,
      center: { x: 150, y: 150 },
      zoom: 2,
      pan: { x: -150, y: -150 },
    };
    const next = applyPinchStep(last, 100, { x: 150, y: 150 }, content);
    expect(next.zoom).toBeLessThan(2);
  });
});
