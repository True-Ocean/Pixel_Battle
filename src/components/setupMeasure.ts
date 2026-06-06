import type { LayoutRect } from './flightMeasure';

export function relRect(container: HTMLElement, el: HTMLElement): LayoutRect {
  const base = container.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return {
    left: r.left - base.left,
    top: r.top - base.top,
    width: r.width,
    height: r.height,
  };
}

export function measureCardEl(
  container: HTMLElement,
  slotEl: HTMLElement,
): LayoutRect {
  const card = slotEl.querySelector(
    '.battle-card, .setup-slot-empty, .setup-hand-empty',
  ) as HTMLElement | null;
  return relRect(container, card ?? slotEl);
}
