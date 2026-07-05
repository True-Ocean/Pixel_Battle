import type { Card } from '../types';
import type { BoardPosition } from '../types/battle';
import { BOARD_POSITIONS } from '../game/battleState';

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(31, h) + str.charCodeAt(i);
    h |= 0;
  }
  return h;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** ルームコードから決定的な初期配置（両端末で一致） */
export function randomFormationSeeded(
  cards: Card[],
  seed: string,
): Record<BoardPosition, Card | null> {
  const rng = mulberry32(hashCode(seed));
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return BOARD_POSITIONS.reduce(
    (acc, position, index) => {
      acc[position] = shuffled[index] ?? null;
      return acc;
    },
    {} as Record<BoardPosition, Card | null>,
  );
}
