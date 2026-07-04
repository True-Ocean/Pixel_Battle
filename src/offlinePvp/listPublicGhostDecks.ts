import { SEED_GHOST_DECKS } from '../data/seedGhostDecks';
import type { PublicGhostDeck } from './types';

function cloneGhostDeck(ghost: PublicGhostDeck): PublicGhostDeck {
  return structuredClone(ghost);
}

function sortByViewerLevel(
  decks: readonly PublicGhostDeck[],
  viewerLevel: number,
): PublicGhostDeck[] {
  const level = Math.max(1, Math.floor(viewerLevel));
  return [...decks].sort((a, b) => {
    const da = Math.abs(a.authorLevel - level);
    const db = Math.abs(b.authorLevel - level);
    if (da !== db) return da - db;
    if (a.authorLevel !== b.authorLevel) return a.authorLevel - b.authorLevel;
    return a.id.localeCompare(b.id);
  });
}

/**
 * viewerLevel 付近を優先した公開デッキ一覧（コピーを返す）。
 * v1 は同梱シードのみ。
 */
export function listPublicGhostDecks(
  viewerLevel: number,
  _options?: { minCount?: number },
): PublicGhostDeck[] {
  return sortByViewerLevel(SEED_GHOST_DECKS, viewerLevel).map(cloneGhostDeck);
}

/** id で1件取得。無ければ null */
export function getPublicGhostDeckById(id: string): PublicGhostDeck | null {
  const found = SEED_GHOST_DECKS.find((ghost) => ghost.id === id);
  return found ? cloneGhostDeck(found) : null;
}
