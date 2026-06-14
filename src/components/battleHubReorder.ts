import { isDeckSlotUnlocked } from '../deckSlots';

export interface BattleHubDropTarget {
  deckIndex: number;
  slotIndex: number;
}

/** バトル Hub のカード／空スロット上でドロップ先を求める */
export function findBattleHubDropTarget(
  clientX: number,
  clientY: number,
  rootEl: HTMLElement,
  unlockedDeckCount: number,
): BattleHubDropTarget | null {
  const slots = Array.from(
    rootEl.querySelectorAll<HTMLElement>('[data-battle-hub-slot-index]'),
  );

  for (const el of slots) {
    const deckIndex = Number(el.dataset.battleHubDeckIndex);
    const slotIndex = Number(el.dataset.battleHubSlotIndex);
    if (!Number.isFinite(deckIndex) || !Number.isFinite(slotIndex)) continue;
    if (!isDeckSlotUnlocked(deckIndex, unlockedDeckCount)) continue;

    const rect = el.getBoundingClientRect();
    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      return { deckIndex, slotIndex };
    }
  }

  return null;
}
