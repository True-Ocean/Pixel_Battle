import { fetchRemotePublicGhostDecks, rowToPublicGhostDeck } from './publish';
import type { PublicGhostDeck } from './types';

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

export type ListPublicGhostDecksResult =
  | { ok: true; decks: PublicGhostDeck[] }
  | {
      ok: false;
      reason: 'not_configured' | 'fetch_failed';
      /** 開発・ログ用。UI には出さないこともある */
      error?: string;
    };

/**
 * viewerLevel 付近を優先した公開デッキ一覧。
 * 成功時は decks（自分の ownerId は除外）。失敗時は reason で区別する。
 */
export async function listPublicGhostDecks(
  viewerLevel: number,
  options?: { excludeOwnerId?: string | null },
): Promise<ListPublicGhostDecksResult> {
  const excludeOwnerId = options?.excludeOwnerId ?? null;
  const remote = await fetchRemotePublicGhostDecks();
  if (!remote.ok) {
    if (remote.error === 'not_configured') {
      return { ok: false, reason: 'not_configured' };
    }
    return {
      ok: false,
      reason: 'fetch_failed',
      error: remote.error,
    };
  }

  const decks = remote.rows
    .filter((row) => !excludeOwnerId || row.owner_id !== excludeOwnerId)
    .map((row) => rowToPublicGhostDeck(row));

  return { ok: true, decks: sortByViewerLevel(decks, viewerLevel) };
}

/** 指定ユーザーが公開中のデッキだけをスロット順で取得する。 */
export async function listPublicGhostDecksByOwnerId(
  ownerId: string,
): Promise<ListPublicGhostDecksResult> {
  const normalizedOwnerId = ownerId.trim();
  if (!normalizedOwnerId) {
    return {
      ok: false,
      reason: 'fetch_failed',
      error: 'owner_id is required',
    };
  }
  const remote = await fetchRemotePublicGhostDecks({
    ownerId: normalizedOwnerId,
  });
  if (!remote.ok) {
    if (remote.error === 'not_configured') {
      return { ok: false, reason: 'not_configured' };
    }
    return {
      ok: false,
      reason: 'fetch_failed',
      error: remote.error,
    };
  }
  const decks = remote.rows
    .map((row) => rowToPublicGhostDeck(row))
    .sort((a, b) => a.slotIndex - b.slotIndex || a.id.localeCompare(b.id));
  return { ok: true, decks };
}

/** id で1件取得。無ければ null（取得失敗時も null） */
export async function getPublicGhostDeckById(
  id: string,
): Promise<PublicGhostDeck | null> {
  const remote = await fetchRemotePublicGhostDecks();
  if (!remote.ok) return null;
  const row = remote.rows.find((item) => item.id === id);
  return row ? rowToPublicGhostDeck(row) : null;
}

/** 一覧画面用のユーザー向けメッセージ */
export function getPublicGhostDeckListEmptyMessage(
  result: ListPublicGhostDecksResult,
): { title: string; hint?: string } {
  if (result.ok) {
    return { title: '公開デッキがありません' };
  }
  if (result.reason === 'not_configured') {
    return {
      title: '公開デッキを表示できません',
      hint: '接続設定がありません。管理者にお問い合わせください。',
    };
  }
  return {
    title: '公開デッキを取得できませんでした',
    hint: '通信環境を確認して、もう一度開き直してください。',
  };
}
