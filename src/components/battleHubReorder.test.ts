import { describe, expect, it } from 'vitest';
import { findBattleHubDropTarget } from './battleHubReorder';

function mockRoot(
  slots: Array<{
    deckIndex: number;
    slotIndex: number;
    rect: { left: number; top: number; right: number; bottom: number };
  }>,
): HTMLElement {
  const elements = slots.map(({ deckIndex, slotIndex, rect }) => ({
    dataset: {
      battleHubDeckIndex: String(deckIndex),
      battleHubSlotIndex: String(slotIndex),
    },
    getBoundingClientRect: () => ({
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.right - rect.left,
      height: rect.bottom - rect.top,
      x: rect.left,
      y: rect.top,
      toJSON: () => ({}),
    }),
  }));

  return {
    querySelectorAll: () => elements,
  } as unknown as HTMLElement;
}

describe('findBattleHubDropTarget', () => {
  it('returns deck and slot under the pointer', () => {
    const root = mockRoot([
      { deckIndex: 0, slotIndex: 1, rect: { left: 0, top: 0, right: 40, bottom: 40 } },
      { deckIndex: 1, slotIndex: 3, rect: { left: 50, top: 0, right: 90, bottom: 40 } },
    ]);

    expect(findBattleHubDropTarget(20, 20, root, 2)).toEqual({
      deckIndex: 0,
      slotIndex: 1,
    });
    expect(findBattleHubDropTarget(70, 20, root, 2)).toEqual({
      deckIndex: 1,
      slotIndex: 3,
    });
  });

  it('ignores locked deck slots', () => {
    const root = mockRoot([
      { deckIndex: 2, slotIndex: 0, rect: { left: 0, top: 0, right: 40, bottom: 40 } },
    ]);

    expect(findBattleHubDropTarget(20, 20, root, 1)).toBeNull();
  });

  it('returns null when pointer is outside slots', () => {
    const root = mockRoot([
      { deckIndex: 0, slotIndex: 0, rect: { left: 0, top: 0, right: 40, bottom: 40 } },
    ]);

    expect(findBattleHubDropTarget(200, 200, root, 1)).toBeNull();
  });
});
