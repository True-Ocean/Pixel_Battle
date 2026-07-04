import { SEED_GHOST_DECKS } from '../data/seedGhostDecks';
import { fetchRemotePublicGhostDecks, rowToPublicGhostDeck } from './publish';
import type { PublicGhostDeck } from './types';

function cloneGhostDeck(ghost: PublicGhostDeck): PublicGhostDeck {
  return structuredClone(ghost);
}

export function sortByViewerLevel(
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

function seedDecks(): PublicGhostDeck[] {
  return SEED_GHOST_DECKS.map(cloneGhostDeck);
}

/**
 * viewerLevel 付近を優先した公開デッキ一覧（コピーを返す）。
 * リモート取得に成功したらリモート＋シードをマージ。自分の ownerId は除外。
 * 失敗・未設定時はシードのみ。
 */
export async function listPublicGhostDecks(
  viewerLevel: number,
  options?: { excludeOwnerId?: string | null },
): Promise<PublicGhostDeck[]> {
  const excludeOwnerId = options?.excludeOwnerId ?? null;
  const remote = await fetchRemotePublicGhostDecks();

  let remoteDecks: PublicGhostDeck[] = [];
  if (remote.ok) {
    remoteDecks = remote.rows
      .filter((row) => !excludeOwnerId || row.owner_id !== excludeOwnerId)
      .map((row) => rowToPublicGhostDeck(row));
  }

  const seeds = seedDecks();
  const merged = [...remoteDecks, ...seeds];
  return sortByViewerLevel(merged, viewerLevel);
}

/** id で1件取得（シード優先、無ければリモート全件から検索） */
export async function getPublicGhostDeckById(
  id: string,
): Promise<PublicGhostDeck | null> {
  const seed = SEED_GHOST_DECKS.find((ghost) => ghost.id === id);
  if (seed) return cloneGhostDeck(seed);

  const remote = await fetchRemotePublicGhostDecks();
  if (!remote.ok) return null;
  const row = remote.rows.find((item) => item.id === id);
  return row ? rowToPublicGhostDeck(row) : null;
}

/** テスト・オフライン用: シードのみ同期一覧 */
export function listSeedPublicGhostDecks(viewerLevel: number): PublicGhostDeck[] {
  return sortByViewerLevel(SEED_GHOST_DECKS, viewerLevel).map(cloneGhostDeck);
}
