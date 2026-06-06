import type { Card } from '../types';

/** Fisher–Yates でデッキ順をシャッフル */
export function shuffleCards(deck: Card[]): Card[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function emptyHandSlots<T>(size: number): (T | null)[] {
  return Array.from({ length: size }, () => null);
}
