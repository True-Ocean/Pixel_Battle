export interface LayoutRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface FlightRects {
  playerFrom: LayoutRect;
  cpuFrom: LayoutRect;
  playerCenter: LayoutRect;
  cpuCenter: LayoutRect;
}

export function measureFlightRects(
  layoutEl: HTMLElement,
  playerSlotEl: HTMLElement,
  cpuSlotEl: HTMLElement,
  playerCenterEl: HTMLElement,
  cpuCenterEl: HTMLElement,
): FlightRects {
  const base = layoutEl.getBoundingClientRect();

  const rel = (el: HTMLElement): LayoutRect => {
    const r = el.getBoundingClientRect();
    return {
      left: r.left - base.left,
      top: r.top - base.top,
      width: r.width,
      height: r.height,
    };
  };

  const slotRect = (slotEl: HTMLElement): LayoutRect => {
    const card = slotEl.querySelector(
      '.battle-card, .battle-card-slot-placeholder',
    ) as HTMLElement | null;
    return rel(card ?? slotEl);
  };

  return {
    playerFrom: slotRect(playerSlotEl),
    cpuFrom: slotRect(cpuSlotEl),
    playerCenter: rel(playerCenterEl),
    cpuCenter: rel(cpuCenterEl),
  };
}

/**
 * スロットと同じサイズのまま中央へ。CPU（上）とプレイヤー（下）は
 * 指定ピクセル分だけ重なるよう縦位置を決める。
 */
export function clashRectAtCenter(
  slot: LayoutRect,
  cpuAnchor: LayoutRect,
  playerAnchor: LayoutRect,
  side: 'cpu' | 'player',
  overlapPx: number,
): LayoutRect {
  const cx =
    (cpuAnchor.left +
      cpuAnchor.width / 2 +
      playerAnchor.left +
      playerAnchor.width / 2) /
    2;
  const midY =
    (cpuAnchor.top +
      cpuAnchor.height / 2 +
      playerAnchor.top +
      playerAnchor.height / 2) /
    2;
  const separation = Math.max(0, slot.height - overlapPx);
  const centerY =
    side === 'cpu' ? midY - separation / 2 : midY + separation / 2;

  return {
    left: cx - slot.width / 2,
    top: centerY - slot.height / 2,
    width: slot.width,
    height: slot.height,
  };
}
